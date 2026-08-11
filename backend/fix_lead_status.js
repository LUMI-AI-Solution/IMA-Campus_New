const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.findMany({
        where: { id: { in: [41614, 41608, 41615] } },
        select: { id: true, callStatus: true, phase: true, name: true, updatedAt: true }
    });
    console.log(leads);
}
main().finally(()=>prisma.$disconnect());
