const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.findMany({
        where: { assignedTo: 48, inquiryType: 'OPEN_SEMINAR' },
        include: { roundProgress: { orderBy: { createdAt: 'desc' } } }
    });
    
    let hasProgress = 0;
    let mismatchedStatus = 0;
    
    leads.forEach(l => {
        if (l.roundProgress && l.roundProgress.length > 0) {
            hasProgress++;
            const latest = l.roundProgress[0];
            if (l.openSemCallStatus !== latest.callStatus) {
                mismatchedStatus++;
            }
        }
    });
    
    console.log(`Kavishka (48) Open Seminar Leads with RoundProgress: ${hasProgress}`);
    console.log(`Mismatched Status: ${mismatchedStatus}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
