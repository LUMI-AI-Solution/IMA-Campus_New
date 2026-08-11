const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const phones = ['94720557852', '94761697027', '94740427186'];
    for (let phone of phones) {
        const student = await prisma.student.findFirst({ where: { phone: { contains: phone } } });
        if (student) {
            console.log(`Student ${phone}: ${student.id}`);
            const payments = await prisma.payment.findMany({
                where: { studentId: student.id }
            });
            console.log(`Payments for ${phone}:`, payments.map(p => ({
                status: p.status, type: p.payment_type, group: p.groupId, date: p.created_at
            })));
        }
    }
}
check().catch(console.error).finally(() => prisma.$disconnect());
