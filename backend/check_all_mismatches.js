const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.findMany({
        where: { openSemCallStatus: 'pending' },
        include: { roundProgress: { orderBy: { createdAt: 'desc' }, where: { campaignCategory: 'OPEN_SEM' } } }
    });
    
    let mismatchedCount = 0;
    let staffMismatches = {};
    
    for (let l of leads) {
        if (l.roundProgress && l.roundProgress.length > 0) {
            const latest = l.roundProgress[0];
            if (l.openSemCallStatus !== latest.callStatus && latest.callStatus !== 'pending') {
                mismatchedCount++;
                const staffId = l.assignedTo || 'Unassigned';
                staffMismatches[staffId] = (staffMismatches[staffId] || 0) + 1;
            }
        }
    }
    
    console.log(`Total mismatched openSemCallStatus leads: ${mismatchedCount}`);
    console.log(`Staff breakdown:`, staffMismatches);
}

main().catch(console.error).finally(() => prisma.$disconnect());
