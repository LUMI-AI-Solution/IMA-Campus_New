const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.findMany({
        where: { assignedTo: 49 },
        include: { chatMessages: true }
    });
    
    let messageCount = 0;
    for (const l of leads) {
        if (l.chatMessages && l.chatMessages.length > 0) {
            messageCount++;
            for (const m of l.chatMessages) {
                console.log(`Lead ${l.id} msg: ${m.message}`);
            }
        }
    }
    console.log(`Out of ${leads.length} leads assigned to Harshani, ${messageCount} have chat messages.`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
