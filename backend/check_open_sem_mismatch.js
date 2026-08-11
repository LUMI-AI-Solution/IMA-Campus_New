const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.findMany({
        where: { assignedTo: 48, inquiryType: 'OPEN_SEMINAR' },
        include: { roundProgress: { orderBy: { createdAt: 'desc' }, where: { campaignCategory: 'OPEN_SEM' } } }
    });
    
    for (let l of leads) {
        if (l.roundProgress && l.roundProgress.length > 0) {
            const latest = l.roundProgress[0];
            if (l.openSemCallStatus !== latest.callStatus) {
                console.log(`Lead ${l.id} - Phone: ${l.phone}`);
                console.log(`  Lead: openSemCallStatus='${l.openSemCallStatus}', openSemFeedback='${l.openSemFeedback}', openSemRound=${l.openSemRound}`);
                console.log(`  Progress: category='${latest.campaignCategory}', status='${latest.callStatus}', feedback='${latest.feedback}', round=${latest.roundNum}`);
            }
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
