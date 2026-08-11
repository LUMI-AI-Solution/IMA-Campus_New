const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const deliveries = await prisma.delivery.findMany({ 
        where: { studentId: "132" },
        include: { items: true } 
    });
    console.log("Deliveries:", deliveries);
}

main().finally(() => prisma.$disconnect());
