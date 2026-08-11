const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const d = await prisma.delivery.findMany({
        where: { studentId: "1645" },
        include: { items: true, payment: true }
    });
    console.log(JSON.stringify(d, null, 2));
}
check().catch(console.error).finally(() => prisma.$disconnect());
