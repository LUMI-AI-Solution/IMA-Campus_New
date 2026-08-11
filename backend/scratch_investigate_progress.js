const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Find all round progress for OPEN_SEM in July
    const progress = await prisma.leadRoundProgress.findMany({
        where: { campaignCategory: 'OPEN_SEM' },
        include: { lead: true }
    });
    
    let count = 0;
    const staffCounts = {};
    for (const p of progress) {
        if (p.createdAt > new Date('2026-07-01')) {
            count++;
            const s = p.lead.assignedTo || 'Unassigned';
            staffCounts[s] = (staffCounts[s] || 0) + 1;
        }
    }
    console.log("Total OPEN_SEM round progress created after July 1st:", count);
    console.log("Current staff of these leads:", staffCounts);
}
main().catch(console.error).finally(() => prisma.$disconnect());
