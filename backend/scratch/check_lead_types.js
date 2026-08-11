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

    const batches = await prisma.batch.findMany({
        where: { 
            businessId: artBusiness?.id, 
            OR: [
                { name: { contains: 'MAY', mode: 'insensitive' } },
                { name: { contains: 'July', mode: 'insensitive' } }
            ]
        }
    });

    const batchIds = batches.map(b => b.id);
    console.log("Batches:", batches.map(b => b.name));

    const leads = await prisma.lead.groupBy({
        by: ['campaignType', 'inquiryType'],
        where: { assignedTo: midu?.id, batchId: { in: batchIds } },
        _count: { _all: true }
    });

    console.log("Leads grouped by campaignType and inquiryType:", leads);

    // Let's also check LeadRoundProgress for these
    const progress = await prisma.leadRoundProgress.groupBy({
        by: ['campaignCategory'],
        where: { lead: { assignedTo: midu?.id, batchId: { in: batchIds } } },
        _count: { _all: true }
    });
    console.log("Progress grouped by campaignCategory:", progress);
}
main().catch(console.error).finally(() => prisma.$disconnect());
