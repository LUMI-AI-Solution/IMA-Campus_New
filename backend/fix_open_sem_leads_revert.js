const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Find all leads in OPEN_SEMINAR
    const leads = await prisma.lead.findMany({
        where: { inquiryType: 'OPEN_SEMINAR', campaignType: 'AFTER_SEMINAR' },
        include: { messages: true }
    });
    
    let revertedCount = 0;
    for (const l of leads) {
        // Check if they ever explicitly typed "open seminar"
        const hasOpenSem = l.messages.some(m => 
            m.message && 
            m.message.trim().toLowerCase() === 'open seminar' &&
            m.direction === 'inbound' // ensure it's a message from the student!
        );
        
        // If they did NOT type "open seminar", they don't belong here.
        // The previous script moved them just because they received a template.
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
