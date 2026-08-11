const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const countWithBatch = await prisma.lead.count({
        where: { campaignType: 'FREE_SEMINAR', batchId: { not: null } }
    });
    const countNoBatch = await prisma.lead.count({
        where: { campaignType: 'FREE_SEMINAR', batchId: null }
    });
    console.log("With batch:", countWithBatch);
    console.log("Without batch:", countNoBatch);
}
main().catch(console.error).finally(() => prisma.$disconnect());
