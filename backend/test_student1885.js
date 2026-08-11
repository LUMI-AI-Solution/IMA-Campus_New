const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const student = await prisma.user.findUnique({
        where: { id: 1885 },
        include: { payments: { include: { business: true, batch: true }, orderBy: { created_at: 'desc' } } }
    });
    console.log(JSON.stringify(student.payments, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
