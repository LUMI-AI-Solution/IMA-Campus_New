const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.findMany({
        where: { campaignType: 'AFTER_SEMINAR', inquiryType: 'PAID_CAMP', source: { not: 'system' } }
    });

    console.log(`Found ${leads.length} leads that were incorrectly converted to PAID_CAMP.`);

    let restored = 0;
    for (const lead of leads) {
        let originalType = 'OPEN_SEMINAR';
        
        // Educated guess
        if (lead.newInqTimestamp) {
            originalType = 'NEW_INQ';
        } else if (lead.source === 'whatsapp' || lead.source === 'direct') {
            originalType = 'NEW_INQ';
        }

        await prisma.lead.update({
            where: { id: lead.id },
            data: { inquiryType: originalType }
        });
        restored++;
    }

    console.log(`Successfully restored ${restored} leads to their original inquiryType.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
