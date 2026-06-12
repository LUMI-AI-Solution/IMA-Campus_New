const { PrismaClient } = require('@prisma/client');
const prismaTaskGen = new PrismaClient();

async function forceMoveNow() {
    console.log("🚀 Forcing 5-Day Old Leads to Round 2...");
    
    const fiveDaysAgo = new Date(new Date().getTime() - (5 * 24 * 60 * 60 * 1000));

    const leadsToPush = await prismaTaskGen.lead.findMany({
        where: {
            campaignType: 'AFTER_SEMINAR',
            coordinationRound: 1, // Round 1 එකේ ඉන්න අය විතරයි
            enrollmentStatus: { not: 'ENROLLED' },
            updatedAt: { lte: fiveDaysAgo } // දවස් 5කට වඩා පරණයි
            // මෙතන callStatus filter එකක් නෑ. ඔක්කොම යනවා.
        }
    });

    console.log(`✅ Found ${leadsToPush.length} leads to move!`);

    console.log("🚀 Script Disabled: Do not create _ROUND_ duplicate leads. Use LeadRoundProgress instead.");
}

forceMoveNow();