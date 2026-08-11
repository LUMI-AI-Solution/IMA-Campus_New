const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.findMany({
        where: { inquiryType: 'OPEN_SEMINAR', campaignType: 'AFTER_SEMINAR' },
        include: { messages: true }
    });
    
    let revertedCount = 0;
    for (const l of leads) {
        // A legit Open Seminar lead MUST have an inbound message explicitly saying 'open seminar' or 'opening seminar'
        const hasOpenSem = l.messages.some(m => 
            m.message && 
            (m.message.trim().toLowerCase() === 'open seminar' || m.message.trim().toLowerCase() === 'opening seminar') &&
            m.direction === 'inbound'
        );
        
        if (!hasOpenSem) {
            await prisma.lead.update({
                where: { id: l.id },
                data: { inquiryType: 'NEW_INQ' }
            });
            revertedCount++;
        }
    }
    console.log(`Successfully reverted ${revertedCount} leads from OPEN_SEMINAR back to NEW_INQ.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
