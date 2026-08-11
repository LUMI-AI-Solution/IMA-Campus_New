const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.findMany({
        where: { assignedTo: 49 },
        include: { messages: true }
    });
    
    let messageCount = 0;
    for (const l of leads) {
        if (l.messages && l.messages.length > 0) {
            messageCount++;
            for (const m of l.messages) {
                console.log(`Lead ${l.id} msg: ${m.message}`);
            }
        }
    }
    console.log(`Out of ${leads.length} leads assigned to Harshani, ${messageCount} have chat messages.`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
