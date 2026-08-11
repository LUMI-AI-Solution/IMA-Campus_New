const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Find all leads with phone containing '_BIZ_17_BATCH_36'
    const newLeads = await prisma.lead.findMany({
        where: { phone: { contains: '_BIZ_17_BATCH_36' } }
    });

    for (const newLead of newLeads) {
        // Extract base phone
        const basePhone = newLead.phone.split('_BIZ_17_BATCH_36')[0];
        
        // Find corresponding old lead
        const oldPhone = `${basePhone}_BIZ_17`;
        const oldLead = await prisma.lead.findUnique({ where: { phone: oldPhone } });

        if (oldLead) {
            console.log(`Found duplicate for ${basePhone}. Moving messages from old lead (${oldLead.id}) to new lead (${newLead.id})`);
            
            // Move chat messages
            await prisma.chatMessage.updateMany({
                where: { leadId: oldLead.id },
                data: { leadId: newLead.id }
            });
            
            // Delete old lead
            await prisma.lead.delete({ where: { id: oldLead.id } });
            console.log(`Merged and deleted old lead ${oldLead.id}`);
        }
    }
}
main().finally(() => prisma.$disconnect());
