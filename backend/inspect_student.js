const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectStudent() {
    try {
        const phone = '0775965662';
        console.log('--- Inspecting Student with phone:', phone, '---');

        const students = await prisma.user.findMany({
            where: {
                OR: [
                    { phone: { contains: phone } },
                    { whatsapp: { contains: phone } }
                ]
            }
        });

        console.log('Students found:', students.length);

        for (const s of students) {
            console.log('\n======================================');
            console.log('Student ID:', s.id, '| Name:', s.firstName, s.lastName, '| Phone:', s.phone, '| WhatsApp:', s.whatsapp);

            const payments = await prisma.payment.findMany({
                where: { studentId: s.id },
                orderBy: { id: 'desc' }
            });
            console.log(`\nPayments Found (${payments.length}):`);
            for (const p of payments) {
                console.log(`- Payment ID: ${p.id} | Status: ${p.status} | Type: ${p.payment_type} | GroupId: ${p.groupId} | Amount: ${p.amount} | Date: ${p.createdAt}`);
                console.log(`  Subjects: ${p.subjects}`);
                
                if (p.groupId) {
                    const g = await prisma.group.findUnique({ where: { id: p.groupId } });
                    console.log(`  Group Info -> ID: ${p.groupId}, Name: ${g ? g.name : 'N/A'}, Type: ${g ? g.type : 'N/A'}`);
                }
            }

            const deliveries = await prisma.delivery.findMany({
                where: { studentId: String(s.id) },
                include: { items: { include: { course: true } }, payment: true },
                orderBy: { id: 'desc' }
            });
            console.log(`\nDeliveries Found (${deliveries.length}):`);
            for (const d of deliveries) {
                console.log(`\n  🚚 Delivery ID: ${d.id} | PaymentID: ${d.paymentId} | Status: ${d.status} | Tracking: ${d.trackingNumber || 'N/A'} | Date: ${d.createdAt}`);
                console.log(`     Label Name: ${d.labelName} | Label Phone: ${d.labelPhone}`);
                console.log(`     Items (${d.items.length}):`);
                for (const item of d.items) {
                    console.log(`       - Item ID: ${item.id} | TuteName: ${item.tuteName} | CourseId: ${item.courseId} | CourseName: ${item.course ? item.course.name : 'N/A'}`);
                    
                    if (item.course && item.course.groupPrices) {
                        try {
                            const gps = JSON.parse(item.course.groupPrices);
                            console.log(`         Content Hub groupPrices for Course ${item.course.id}:`, JSON.stringify(gps));
                            if (d.payment && d.payment.groupId) {
                                const match = gps.find(g => g.groupId == d.payment.groupId);
                                console.log(`         Match for GroupId ${d.payment.groupId}:`, JSON.stringify(match));
                            }
                        } catch(e) {
                            console.error('Error parsing groupPrices:', e.message);
                        }
                    } else {
                        console.log(`         Course ${item.courseId} has NO groupPrices!`);
                    }
                }
            }
        }

    } catch (e) {
        console.error('Error inspecting student:', e);
    } finally {
        await prisma.$disconnect();
    }
}
inspectStudent();
