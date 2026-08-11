const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const groupedCampaigns = await prisma.lead.groupBy({
        by: ['campaignType', 'batchId'],
        where: {
            batchId: 40
        },
        _count: {
            id: true
        }
    });
    console.log("Leads by campaign for batch 40:", JSON.stringify(groupedCampaigns, null, 2));

    const groupedCampaignsByBusiness = await prisma.lead.groupBy({
        by: ['campaignType', 'batchId'],
        where: {
            batchId: {
                in: [40, 41] // maybe checking 41 just in case
            }
        },
        _count: {
            id: true
        }
    });
    console.log("Leads by campaign for batch 40 & 41:", JSON.stringify(groupedCampaignsByBusiness, null, 2));

    // Also let's check a few leads for batch 40
    const sampleLeads = await prisma.lead.findMany({
        where: {
            batchId: 40
        },
        take: 3
    });
    console.log("Sample leads:", JSON.stringify(sampleLeads, null, 2));
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
