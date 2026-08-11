const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const d = await prisma.delivery.findMany({
        where: { studentId: "975" },
        include: { payment: true }
    });
    console.log("Deliveries for Student 975:");
    console.log(JSON.stringify(d, null, 2));
}
check().catch(console.error).finally(() => prisma.$disconnect());
