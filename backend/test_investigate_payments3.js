const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const users = await prisma.user.findMany({
        where: { phone: { contains: '538028' } }
    });
    
    for (const user of users) {
        console.log(`User ${user.id} Phone: ${user.phone}`);
        const payments = await prisma.payment.findMany({
            where: { studentId: user.id }
        });
        console.log(`User ${user.id} Payments:`);
        payments.forEach(p => console.log(`  - ID: ${p.id}, Group: ${p.groupId}, Status: ${p.status}, Subjects: ${p.subjects}`));
    }
}
check().finally(() => prisma.$disconnect());
