const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const progress = await prisma.leadRoundProgress.findMany({
        where: { leadId: 41120 }
    });
    console.log("RoundProgress for 41120:", progress);
}

main().catch(console.error).finally(() => prisma.$disconnect());
