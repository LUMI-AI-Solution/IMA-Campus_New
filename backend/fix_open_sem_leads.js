const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Find all leads in NEW_INQ that have a message "open seminar" or template output
    const leads = await prisma.lead.findMany({
        where: { inquiryType: 'NEW_INQ', campaignType: 'AFTER_SEMINAR' },
        include: { messages: true }
    });
    
    let updatedCount = 0;
    for (const l of leads) {
        const hasOpenSem = l.messages.some(m => m.message && m.message.toLowerCase() === 'open seminar');
        const hasTemplate = l.lastMessage && l.lastMessage.includes('Template Output');
        
        // If they explicitly typed OPEN SEMINAR, they definitely belong to OPEN_SEMINAR
        // If they received a template like new_students, they might have been intended for OPEN_SEMINAR,
        // but let's just fix the ones that typed 'open seminar' or received templates just to be safe.
        // Actually, to be very precise, let's just update the ones that have "open seminar" as a message,
        // OR have "Template Output" in their messages.
        if (hasOpenSem || hasTemplate) {
            await prisma.lead.update({
                where: { id: l.id },
                data: { inquiryType: 'OPEN_SEMINAR' }
            });
            updatedCount++;
        }
    }
    console.log(`Successfully moved ${updatedCount} leads from NEW_INQ to OPEN_SEMINAR.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
