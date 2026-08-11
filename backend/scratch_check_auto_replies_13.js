const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const replies = await prisma.autoReply.findMany({
        where: { businessId: 13 },
        orderBy: [{ campaignType: 'asc' }, { stepOrder: 'asc' }]
    });
    console.log(JSON.stringify(replies, null, 2));
}

main().finally(() => prisma.$disconnect());
