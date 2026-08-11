const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // start of today
    
    const leads = await prisma.lead.count({
        where: { assignedTo: 49, updatedAt: { gte: today } }
    });
    console.log("Leads assigned/updated for Harshani today:", leads);
    
    const leadsByBatch = await prisma.lead.groupBy({
        by: ['batchId'],
        where: { assignedTo: 49, updatedAt: { gte: today } },
        _count: { id: true }
    });
    console.log("Leads updated today grouped by batch:");
    console.log(leadsByBatch);
}
main().catch(console.error).finally(() => prisma.$disconnect());
