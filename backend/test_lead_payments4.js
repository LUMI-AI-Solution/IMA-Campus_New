const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const leads = ['94766561661', '9477538028'];
    for (const phone of leads) {
        console.log(`\n--- Phone: ${phone} ---`);
        const users = await prisma.user.findMany({
            where: { phone: { contains: phone } }
        });
        console.log("Found Users:", users.map(u => u.id));
        
        for (const user of users) {
            const payments = await prisma.payment.findMany({
                where: { studentId: user.id }
            });
            console.log(`User ${user.id} Payments:`, payments.length);
            payments.forEach(p => console.log(`  - ID: ${p.id}, Group: ${p.groupId}, Type: ${p.payment_type}, Status: ${p.status}, Batch: ${p.batchId}`));
        }
    }
}
check().finally(() => prisma.$disconnect());
