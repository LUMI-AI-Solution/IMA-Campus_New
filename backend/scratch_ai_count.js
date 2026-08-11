const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAiCount() {
    const count = await prisma.payment.count({
        where: {
            aiVerified: true
        }
    });
    console.log(`Total AI Verified Slips in DB: ${count}`);
    await prisma.$disconnect();
}

checkAiCount();
