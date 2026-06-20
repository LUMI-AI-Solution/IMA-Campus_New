const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        console.log("Starting Mass DB Deduplication...");

        const allLeads = await prisma.lead.findMany({
            where: {},
            select: { id: true, phone: true, inquiryType: true, updatedAt: true }
        });
        
        const leadsByPhone = {};
        allLeads.forEach(l => {
            const cleanPhone = l.phone.split('_')[0].replace(/[^0-9]/g, '');
            if (!leadsByPhone[cleanPhone]) leadsByPhone[cleanPhone] = [];
            leadsByPhone[cleanPhone].push(l);
        });
        
        let deletedCount = 0;
        let mergedChats = 0;
        
        const typePriority = {
            'PAID_CAMP': 4,
            'OPEN_SEMINAR': 3,
            'NEW_INQ': 2,
            'NORMAL': 1
        };

        for (const phone in leadsByPhone) {
            const group = leadsByPhone[phone];
            if (group.length > 1) {
                // Sort by priority, then by updatedAt descending
                group.sort((a, b) => {
                    const pA = typePriority[a.inquiryType] || 0;
                    const pB = typePriority[b.inquiryType] || 0;
                    if (pA !== pB) return pB - pA;
                    return new Date(b.updatedAt) - new Date(a.updatedAt);
                });

                const survivor = group[0];
                const duplicates = group.slice(1);

                for (const oldLead of duplicates) {
                    try {
                        // Move chat messages
                        const chats = await prisma.chatMessage.updateMany({
                            where: { leadId: oldLead.id },
                            data: { leadId: survivor.id }
                        });
                        mergedChats += chats.count;

                        // Delete related Round Progress
                        await prisma.leadRoundProgress.deleteMany({
                            where: { leadId: oldLead.id }
                        });

                        // Delete duplicate Lead
                        await prisma.lead.delete({
                            where: { id: oldLead.id }
                        });
                        deletedCount++;
                    } catch (err) {
                        console.error(`Failed to delete lead ${oldLead.id}:`, err.message);
                    }
                }
            }
        }
        
        console.log(`\n✅ Deduplication Complete!`);
        console.log(`Removed ${deletedCount} duplicate leads.`);
        console.log(`Merged ${mergedChats} chat messages to surviving leads.`);
        
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

run();
