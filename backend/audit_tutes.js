const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function audit() {
    try {
        console.log('Auditing deliveries created for non-ticked (deliverTute=false) subjects...');

        const items = await prisma.deliveryItem.findMany({
            include: {
                delivery: {
                    include: {
                        payment: true
                    }
                },
                course: true
            },
            orderBy: { id: 'desc' }
        });

        const report = [];

        for (const item of items) {
            const delivery = item.delivery;
            const payment = delivery?.payment;
            const course = item.course;

            if (!payment || !course) continue;

            const groupId = payment.groupId;
            let deliverTuteConfigured = false;
            let matchFound = false;

            if (course.groupPrices && groupId) {
                try {
                    const gps = JSON.parse(course.groupPrices);
                    const match = gps.find(g => g.groupId == groupId);
                    if (match) {
                        matchFound = true;
                        if (match.deliverTute === true || match.deliverTute === 'true') {
                            deliverTuteConfigured = true;
                        }
                    }
                } catch (err) {
                    // Ignore JSON parse errors
                }
            }

            if (!deliverTuteConfigured) {
                report.push({
                    deliveryId: delivery ? delivery.id : null,
                    deliveryStatus: delivery ? delivery.status : 'Unknown',
                    createdAt: delivery ? delivery.createdAt : null,
                    trackingNumber: (delivery && delivery.trackingNumber) ? delivery.trackingNumber : 'N/A',
                    studentId: delivery ? delivery.studentId : null,
                    studentName: (delivery && delivery.labelName) ? delivery.labelName : 'Unknown',
                    studentPhone: (delivery && delivery.labelPhone) ? delivery.labelPhone : 'N/A',
                    paymentId: payment.id,
                    paymentType: payment.payment_type === 3 ? 'Full Payment' : (payment.payment_type === 2 ? 'Installment' : 'Monthly'),
                    groupId: groupId || 'None',
                    courseId: course.id,
                    courseName: course.name,
                    tuteItemName: item.tuteName || course.name,
                    matchFound: matchFound,
                    deliverTuteSetting: matchFound ? 'false (Unticked)' : 'Not Set'
                });
            }
        }

        console.log('Total unticked/fallback delivery items found:', report.length);
        fs.writeFileSync('/root/IMA-Campus/backend/unticked_tute_deliveries_report.json', JSON.stringify(report, null, 2));

        const statusCounts = {};
        report.forEach(r => {
            statusCounts[r.deliveryStatus] = (statusCounts[r.deliveryStatus] || 0) + 1;
        });
        console.log('Status Breakdown:', JSON.stringify(statusCounts));

        if (report.length > 0) {
            console.log('Sample Record:', JSON.stringify(report[0], null, 2));
        }

    } catch (e) {
        console.error('Audit Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

audit();
