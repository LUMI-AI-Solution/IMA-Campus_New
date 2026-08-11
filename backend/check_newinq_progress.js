const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.findMany({
        where: { assignedTo: 48, inquiryType: 'OPEN_SEMINAR' },
        include: { roundProgress: { orderBy: { createdAt: 'desc' } } }
    });
    
    let withNewInqProgress = 0;
    
    leads.forEach(l => {
        const hasOpenSemProgress = l.roundProgress.some(p => p.campaignCategory === 'OPEN_SEM' && p.callStatus !== 'pending');
        const hasNewInqProgress = l.roundProgress.some(p => p.campaignCategory === 'NEW_INQ' && p.callStatus !== 'pending');
        if (l.openSemCallStatus === 'pending' && !hasOpenSemProgress && hasNewInqProgress) {
            withNewInqProgress++;
        }
    });
    
    console.log(`Pending OPEN_SEM leads with NEW_INQ progress for Kavishka (48): ${withNewInqProgress}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
