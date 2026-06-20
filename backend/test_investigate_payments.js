const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const leads = ['94766561661', '9477538028'];
    for (const phone of leads) {
        console.log(`\n--- Phone: ${phone} ---`);
        const users = await prisma.user.findMany({
            where: { phone: { contains: phone.substring(2) } }
        });
        
        for (const user of users) {
            const payments = await prisma.payment.findMany({
                where: { studentId: user.id }
            });
            console.log(`User ${user.id} Payments:`);
            payments.forEach(p => console.log(`  - ID: ${p.id}, Group: ${p.groupId}, Status: ${p.status}, Subjects: ${p.subjects}`));
        }
    }
}
check().finally(() => prisma.$disconnect());
