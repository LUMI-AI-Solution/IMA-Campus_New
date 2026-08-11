const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    // 1. Update crmSettings to have batchId 36
    await prisma.crmSettings.updateMany({
        where: { businessId: 17, campaignType: 'AFTER_SEMINAR' },
        data: { batchId: '36' } // Note: schema might use String for batchId in CrmSettings
    });
    console.log("Updated crmSettings batchId to 36");

    // 2. Update all leads with phone containing _BIZ_17 to have batchId 36
    const updated = await prisma.lead.updateMany({
        where: { 
            campaignType: 'AFTER_SEMINAR', 
            phone: { contains: '_BIZ_17' },
            batchId: null
        },
        data: { batchId: 36 } // batchId on lead is Int
    });
    console.log(`Updated ${updated.count} leads to batchId 36`);
}
main().finally(() => prisma.$disconnect());
