const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Find all round progress created by leads CURRENTLY assigned to Harshani
    const progress = await prisma.leadRoundProgress.findMany({
        where: { lead: { assignedTo: 49 } }
    });
    
    const byCategory = {};
    for (const p of progress) {
        if (p.createdAt > new Date('2026-07-01')) {
            byCategory[p.campaignCategory] = (byCategory[p.campaignCategory] || 0) + 1;
        }
    }
    console.log("Progress records for leads CURRENTLY assigned to Harshani (since July 1):", byCategory);
}
main().catch(console.error).finally(() => prisma.$disconnect());
