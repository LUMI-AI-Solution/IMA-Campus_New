const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixSystemLeadsWithMessages() {
    console.log("Checking for system leads that have chat messages...");
    
    // Find system leads with messages
    const leadsWithMsgs = await prisma.lead.findMany({
        where: {
            source: 'system',
            campaignType: 'AFTER_SEMINAR',
            messages: { some: {} }
        }
    });

    if (leadsWithMsgs.length > 0) {
        console.log(`Found ${leadsWithMsgs.length} system leads that actually have messages. Updating to source='whatsapp'...`);
        
        const ids = leadsWithMsgs.map(l => l.id);
        
        await prisma.lead.updateMany({
            where: { id: { in: ids } },
            data: { source: 'whatsapp' }
        });
        console.log("Update complete.");
    } else {
        console.log("No system leads with messages found.");
    }
}

fixSystemLeadsWithMessages().finally(() => prisma.$disconnect());
