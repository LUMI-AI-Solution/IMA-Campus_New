const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.findMany({
        where: { inquiryType: 'NEW_INQ', campaignType: 'AFTER_SEMINAR' },
        include: { messages: true },
        take: 50,
        orderBy: { updatedAt: 'desc' }
    });
    
    let count = 0;
    leads.forEach(l => {
        const msgs = l.messages;
        if (msgs.length > 0) {
            // Check if any message is "open seminar"
            const hasOpenSem = msgs.some(m => m.message && m.message.toLowerCase() === 'open seminar');
            if (hasOpenSem) {
                console.log(`Lead ID: ${l.id}, Phone: ${l.phone}, LastMessage: ${l.lastMessage}`);
                count++;
            }
        }
    });
    console.log(`Found ${count} NEW_INQ leads with 'OPEN SEMINAR' messages.`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
