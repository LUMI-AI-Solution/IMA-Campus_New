const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function check() {
    const courses = await prisma.course.findMany({ select: { id: true, groupPrices: true, name: true } });
    const courseMap = new Map();
    for (const c of courses) courseMap.set(c.id, c);

    const recentDate = new Date();
    recentDate.setMonth(recentDate.getMonth() - 2);

    // ONLY status 1 (Fully Approved)
    const payments = await prisma.payment.findMany({
        where: { 
            status: 1, 
            subjects: { not: null },
            created_at: { gte: recentDate },
            amount: { gt: 0 }
        },
        include: { auditLogs: true, student: true }
    });

    const validPayments = payments.filter(p => {
        const hasBypassLog = p.auditLogs.some(log => ['FREE_CARD', 'DISCOUNT'].includes(log.action));
        if (hasBypassLog) return false;
        if (p.remark && (p.remark.includes('Free Card') || p.remark.includes('Discount') || p.remark.includes('testing'))) return false;
        return true;
    });

    const allDeliveryItems = await prisma.deliveryItem.findMany({
        select: { courseId: true, delivery: { select: { studentId: true } } }
    });

    const deliveredSet = new Set();
    for (const item of allDeliveryItems) {
        if (item.delivery && item.delivery.studentId) {
            deliveredSet.add(`${item.delivery.studentId}_${item.courseId}`);
        }
    }

    const missingTutes = [];

    for (const payment of validPayments) {
        if (!payment.subjects || !payment.studentId) continue;
        let subIds = [];
        try { subIds = JSON.parse(payment.subjects).map(id => parseInt(id)); } catch(e) { continue; }

        for (const courseId of subIds) {
            const course = courseMap.get(courseId);
            if (!course || !course.groupPrices) continue;

            let shouldDeliver = false;
            let expectedTuteName = course.name;
            
            if (payment.groupId) {
                try {
                    const gps = JSON.parse(course.groupPrices);
                    const match = gps.find(g => g.groupId == payment.groupId);
                    if (match && (match.deliverTute === true || match.deliverTute === 'true')) {
                        shouldDeliver = true;
                        if (match.tuteName) expectedTuteName = match.tuteName;
                    }
                } catch(e) {}
            }

            if (shouldDeliver) {
                const key = `${payment.studentId}_${courseId}`;
                if (!deliveredSet.has(key)) {
                    missingTutes.push({
                        studentId: payment.studentId,
                        name: `${payment.student?.firstName || ''} ${payment.student?.lastName || ''}`.trim(),
                        phone: payment.student?.phone || 'N/A',
                        paymentId: payment.id,
                        courseName: course.name,
                        paymentDate: payment.created_at.toISOString().split('T')[0]
                    });
                }
            }
        }
    }

    console.log(`Found ${missingTutes.length} TRUE missing tute records!`);
    
    let csvContent = "Student ID,Name,Phone,Missing Course,Payment ID,Payment Date\n";
    for (const m of missingTutes) {
        csvContent += `${m.studentId},"${m.name}","${m.phone}","${m.courseName}",${m.paymentId},${m.paymentDate}\n`;
    }
    fs.writeFileSync('./missing_tutes_true.csv', csvContent);
}

check().catch(console.error).finally(() => prisma.$disconnect());
