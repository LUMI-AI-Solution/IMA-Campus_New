const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.findMany({
        where: { assignedTo: 48, inquiryType: 'OPEN_SEMINAR' },
        include: { roundProgress: { orderBy: { createdAt: 'desc' } } }
    });
    
    let pendingNoProgress = 0;
    
    leads.forEach(l => {
        const hasOpenSemProgress = l.roundProgress.some(p => p.campaignCategory === 'OPEN_SEM' && p.callStatus !== 'pending');
        if (l.openSemCallStatus === 'pending' && !hasOpenSemProgress) {
            pendingNoProgress++;
        }
    });
    
    console.log(`Pending leads with NO OPEN_SEM progress for Kavishka (48): ${pendingNoProgress}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
