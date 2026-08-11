const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    let whereClause = { campaignType: 'AFTER_SEMINAR', source: { not: 'system' }, batchId: 26, inquiryType: { in: ['OPEN_SEMINAR', 'NORMAL'] } };
    
    const unassigned = await prisma.lead.count({ where: { ...whereClause, assignedTo: null } });
    const assignedToOthers = await prisma.lead.groupBy({
        by: ['assignedTo'],
        where: { ...whereClause, assignedTo: { not: null } },
        _count: { id: true }
    });

    console.log("Unassigned AFTER_SEMINAR OPEN_SEM/NORMAL in Batch 26:", unassigned);
    console.log("Assigned to others:");
    console.log(assignedToOthers);
}
main().catch(console.error).finally(() => prisma.$disconnect());
