const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    console.log("--- Student 303 Payment 4102 ---");
    const p = await prisma.payment.findUnique({
        where: { id: 4102 },
        include: { delivery: { include: { items: true } }, auditLogs: true }
    });
    console.log(JSON.stringify(p, null, 2));

    console.log("\n--- Deliveries for Student 303 ---");
    const d = await prisma.delivery.findMany({
        where: { studentId: "303" },
        include: { items: true, payment: true }
    });
    console.log(JSON.stringify(d, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
