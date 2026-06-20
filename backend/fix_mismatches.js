const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        console.log("Starting DB Cleanup...");

        // 1. Find and remove duplicate leads (Keep PAID_CAMP, delete NEW_INQ/OPEN_SEMINAR)
        const allLeads = await prisma.lead.findMany({
            where: { campaignType: 'AFTER_SEMINAR' }
        });
        
        const leadsByPhone = {};
        allLeads.forEach(l => {
            const cleanPhone = l.phone.split('_')[0].replace(/[^0-9]/g, '');
            if (!leadsByPhone[cleanPhone]) leadsByPhone[cleanPhone] = [];
            leadsByPhone[cleanPhone].push(l);
        });
        
        let deletedOldLeads = 0;
        
        for (const phone in leadsByPhone) {
            const group = leadsByPhone[phone];
            if (group.length > 1) {
                const paidLeads = group.filter(l => l.inquiryType === 'PAID_CAMP');
                const inquiryLeads = group.filter(l => ['NEW_INQ', 'OPEN_SEMINAR', 'NORMAL'].includes(l.inquiryType));
                
                if (paidLeads.length > 0 && inquiryLeads.length > 0) {
                    // We have both! The old system duplicated them. 
                    // Delete the inquiry leads to keep counts accurate, keep the PAID_CAMP lead
                    for (const inqLead of inquiryLeads) {
                        await prisma.lead.delete({ where: { id: inqLead.id } });
                        deletedOldLeads++;
                    }
                }
            }
        }
        console.log(`Deleted ${deletedOldLeads} duplicate Inquiry leads where a PAID_CAMP lead already existed.`);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

run();
