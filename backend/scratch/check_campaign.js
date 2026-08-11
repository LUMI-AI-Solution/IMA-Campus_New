const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const types = await prisma.lead.groupBy({
        by: ['campaignType']
    });
    console.log("Campaign Types:", types);

    const categories = await prisma.leadRoundProgress.groupBy({
        by: ['campaignCategory']
    });
    console.log("Campaign Categories:", categories);
}
main().catch(console.error).finally(() => prisma.$disconnect());
