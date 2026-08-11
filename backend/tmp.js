const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const leads = await prisma.lead.findMany({ 
        where: { phone: { startsWith: '94714941559' } },
        select: { id: true, phone: true, name: true, createdAt: true, updatedAt: true, assignedTo: true, status: true, batchId: true, campaignType: true }
    });
    console.log(leads);
}
main().finally(() => prisma.$disconnect());
