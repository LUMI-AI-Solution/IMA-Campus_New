const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const leads = await prisma.lead.groupBy({
        by: ['assignedTo', 'campaignType'],
        where: { updatedAt: { gte: oneHourAgo }, assignedTo: 49 },
        _count: { id: true }
    });
    console.log("Leads assigned to Harshani in the last hour:");
    console.log(leads);
}
main().catch(console.error).finally(() => prisma.$disconnect());
