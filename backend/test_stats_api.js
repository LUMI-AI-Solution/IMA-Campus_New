const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    let bizFilter = 6; // We'll just test a random business ID that might exist. Let's find one first.
    const batch = await prisma.batch.findFirst({ where: { status: 1 } });
    if (!batch) return console.log("no batch");
    
    let start = new Date("2020-01-01T00:00:00.000Z");
    let end = new Date("2030-01-01T00:00:00.000Z");
    
    let leadWhere = { campaignType: 'FREE_SEMINAR', createdAt: { gte: start, lte: end } };
    leadWhere.batchId = batch.id;
    
    const reportRaw = await prisma.lead.groupBy({
        by: ['assignedTo'],
        where: leadWhere,
        _count: { id: true },
        _sum: {
            callAttempt: true
        }
    });
    console.log("Stats for batch", batch.id, ":", reportRaw.length, "groups");
}
main().catch(console.error).finally(() => prisma.$disconnect());
