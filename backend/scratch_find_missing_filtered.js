const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function findMissing() {
    const courses = await prisma.course.findMany({ select: { id: true, groupPrices: true, name: true } });
    const courseMap = new Map();
    for (const c of courses) courseMap.set(c.id, c);

    const recentDate = new Date();
    recentDate.setMonth(recentDate.getMonth() - 2);

    const payments = await prisma.payment.findMany({
        where: { 
            status: { in: [1, 4] },
            subjects: { not: null },
            created_at: { gte: recentDate },
            amount: { gt: 0 } // Exclude completely free ones
        },
        include: {
            auditLogs: true
        }
    });

    const validPayments = payments.filter(p => {
        // Exclude manual Free Cards and Discounts which bypass Auto Delivery
        const hasBypassLog = p.auditLogs.some(log => ['FREE_CARD', 'DISCOUNT'].includes(log.action));
        if (hasBypassLog) return false;
        
        // Also check remarks just in case
        if (p.remark && (p.remark.includes('Free Card') || p.remark.includes('Discount'))) return false;

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
                        paymentId: payment.id,
                        courseId: courseId,
                        courseName: course.name,
                        expectedTuteName: expectedTuteName,
                        paymentDate: payment.created_at,
                        method: payment.method
                    });
                }
            }
        }
    }
    
    const byStudent = {};
    for (const m of missingTutes) {
        if (!byStudent[m.studentId]) byStudent[m.studentId] = [];
        byStudent[m.studentId].push(m);
    }
    
    const summary = [];
    for (const studentId in byStudent) {
        summary.push({
            studentId,
            missingCount: byStudent[studentId].length,
            missingCourses: byStudent[studentId].map(x => `${x.courseName} (PID: ${x.paymentId}, Method: ${x.method})`).join(' | ')
        });
    }

    fs.writeFileSync('./missing_tutes_filtered.json', JSON.stringify(summary, null, 2));
    console.log(`Found ${summary.length} students with actual missing tutes (excluding Free Cards/Discounts).`);
}

findMissing().catch(console.error).finally(() => prisma.$disconnect());
