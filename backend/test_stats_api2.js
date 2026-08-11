const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    let start = new Date("2020-01-01T00:00:00.000Z");
    let end = new Date("2030-01-01T00:00:00.000Z");
    let batchFilter = 39;
    
    let leadWhere = { campaignType: 'FREE_SEMINAR', createdAt: { gte: start, lte: end } };
    leadWhere.batchId = batchFilter;
    
    const reportRaw = await prisma.lead.groupBy({
        by: ['assignedTo'],
        where: leadWhere,
        _count: { id: true },
        _sum: {
            callAttempt: true
        }
    });
    console.log("Raw Report:", reportRaw);
}
main().catch(console.error).finally(() => prisma.$disconnect());
