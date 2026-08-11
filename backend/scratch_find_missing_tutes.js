const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function findMissing() {
    console.log("Fetching courses and payments to analyze...");
    
    const courses = await prisma.course.findMany({
        select: { id: true, groupPrices: true, name: true }
    });
    
    const courseMap = new Map();
    for (const c of courses) {
        courseMap.set(c.id, c);
    }

    // Check last 2 months to focus on recent batches where this issue likely occurred
    const recentDate = new Date();
    recentDate.setMonth(recentDate.getMonth() - 2);

    const payments = await prisma.payment.findMany({
        where: { 
            status: { in: [1, 4] },
            subjects: { not: null },
            created_at: { gte: recentDate }
        },
        select: {
            id: true,
            studentId: true,
            groupId: true,
            subjects: true,
            created_at: true,
            payment_type: true
        }
    });

    console.log(`Found ${payments.length} approved payments since ${recentDate.toDateString()}.`);

    const allDeliveryItems = await prisma.deliveryItem.findMany({
        select: {
            courseId: true,
            delivery: {
                select: {
                    studentId: true
                }
            }
        }
    });

    const deliveredSet = new Set();
    for (const item of allDeliveryItems) {
        if (item.delivery && item.delivery.studentId) {
            deliveredSet.add(`${item.delivery.studentId}_${item.courseId}`);
        }
    }

    const missingTutes = [];
    let analyzedPayments = 0;

    for (const payment of payments) {
        if (!payment.subjects || !payment.studentId) continue;
        
        let subIds = [];
        try {
            subIds = JSON.parse(payment.subjects).map(id => parseInt(id));
        } catch(e) { continue; }

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
                        paymentDate: payment.created_at
                    });
                }
            }
        }
        analyzedPayments++;
    }

    console.log(`Analyzed ${analyzedPayments} payments.`);
    
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
            missingCourses: byStudent[studentId].map(x => `${x.courseName} (PID: ${x.paymentId})`).join(' | ')
        });
    }

    console.log(`Found ${summary.length} students with missing tutes!`);
    fs.writeFileSync('./missing_tutes_report.json', JSON.stringify(summary, null, 2));
    console.log("Report saved to ./missing_tutes_report.json");
}

findMissing().catch(console.error).finally(() => prisma.$disconnect());
