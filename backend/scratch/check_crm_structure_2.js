const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const artBusiness = await prisma.business.findFirst({
        where: { name: { contains: 'Art' } }
    });

    const midu = await prisma.user.findFirst({
        where: { 
            role: { in: ['COORDINATOR', 'ADMIN', 'SUPER_ADMIN'] },
            OR: [
                { firstName: { contains: 'midu' } },
                { lastName: { contains: 'midu' } }
            ]
        }
    });
    console.log("Coordinator Midu ID:", midu?.id);

    const tabs = await prisma.afterSeminarLead.groupBy({
        by: ['campaignName', 'subCampaignName', 'tab', 'subTab']
    });
    console.log("Existing CRM Tabs:");
    console.log(tabs);

    const mayBatch = await prisma.batch.findFirst({
        where: { businessId: artBusiness?.id, name: { contains: 'MAY', mode: 'insensitive' } }
    });
    const julyBatch = await prisma.batch.findFirst({
        where: { businessId: artBusiness?.id, name: { contains: 'July', mode: 'insensitive' } }
    });

    console.log("May Batch ID:", mayBatch?.id);
    console.log("July Batch ID:", julyBatch?.id);
}
main().catch(console.error).finally(() => prisma.$disconnect());
