const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.findMany({
        where: { inquiryType: 'NEW_INQ', campaignType: 'AFTER_SEMINAR' },
        include: { messages: true },
        take: 20,
        orderBy: { updatedAt: 'desc' }
    });
    
    leads.forEach(l => {
        const msgs = l.messages.map(m => m.message).join(" | ");
        if (msgs.toLowerCase().includes('open seminar') || msgs.toLowerCase().includes('opening seminar')) {
            console.log(`\nLead ID: ${l.id}, Phone: ${l.phone}, LastMessage: ${l.lastMessage}`);
            l.messages.slice(0, 3).forEach(m => {
                console.log(` - Msg: ${m.message} (Type: ${m.type || m.mediaType}, Dir: ${m.direction})`);
            });
        }
    });
}
main().catch(console.error).finally(() => prisma.$disconnect());
