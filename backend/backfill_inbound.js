const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const records = await prisma.whatsAppCallRecord.findMany({
        where: {
            direction: 'INBOUND',
            campaignType: null
        }
    });

    console.log(`Found ${records.length} INBOUND calls with missing campaignType.`);

    let updatedFreeSem = 0;
    let updatedAfterSem = 0;
    let notFound = 0;

    for (const record of records) {
        let phone = record.leadPhone;
        if (!phone) continue;
        
        let lead = await prisma.lead.findFirst({
            where: { phone: { startsWith: phone } }
        });

        if (!lead && phone.startsWith('94')) {
            lead = await prisma.lead.findFirst({
                where: { phone: { startsWith: '0' + phone.substring(2) } }
            });
        }
        
        if (!lead && phone.startsWith('0')) {
            lead = await prisma.lead.findFirst({
                where: { phone: { startsWith: '94' + phone.substring(1) } }
            });
        }

        if (lead && lead.campaignType) {
            await prisma.whatsAppCallRecord.update({
                where: { id: record.id },
                data: { campaignType: lead.campaignType }
            });
            if (lead.campaignType === 'FREE_SEMINAR') updatedFreeSem++;
            else if (lead.campaignType === 'AFTER_SEMINAR') updatedAfterSem++;
        } else {
            notFound++;
        }
    }

    console.log(`Updated ${updatedFreeSem} Free Sem calls.`);
    console.log(`Updated ${updatedAfterSem} After Sem calls.`);
    console.log(`Could not find lead for ${notFound} calls.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
