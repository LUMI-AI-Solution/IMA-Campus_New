const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Find business
    const artBusiness = await prisma.business.findFirst({
        where: { name: { contains: 'Art' } }
    });
    console.log("Art Business:", artBusiness?.id, artBusiness?.name);

    // Find coordinator Midu
    const midu = await prisma.user.findFirst({
        where: { 
            role: { in: ['COORDINATOR', 'ADMIN', 'SUPER_ADMIN'] },
            OR: [
                { firstName: { contains: 'midu' } },
                { lastName: { contains: 'midu' } },
                { email: { contains: 'midu' } }
            ]
        }
    });
    console.log("Coordinator Midu:", midu?.id, midu?.firstName, midu?.lastName);

    // Find batches
    if (artBusiness) {
        const batches = await prisma.batch.findMany({
            where: { businessId: artBusiness.id, name: { contains: '2027' } }
        });
        batches.forEach(b => console.log(`Batch: ${b.id} - ${b.name}`));
    }

    // Check a few leads to understand the structure
    const sampleLeads = await prisma.afterSeminarLead.findMany({
        take: 3
    });
    console.log("Sample Leads Structure:", sampleLeads);
    
    // Check how "New Inquiries" and "Open Seminar" are stored
    const tabs = await prisma.afterSeminarLead.groupBy({
        by: ['campaignName', 'subCampaignName', 'status', 'tab', 'subTab']
    });
    console.log("Existing Tabs/Campaigns:", tabs);
}
main().catch(console.error).finally(() => prisma.$disconnect());
