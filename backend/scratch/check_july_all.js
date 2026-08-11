const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const artBusiness = await prisma.business.findFirst({
        where: { name: { contains: 'Art' } }
    });

    const julyBatch = await prisma.batch.findFirst({
        where: { businessId: artBusiness?.id, name: { contains: 'July' } }
    });
    
    // Check all leads for July batch
    const leads = await prisma.lead.groupBy({
        by: ['assignedTo', 'inquiryType'],
        where: { batchId: julyBatch.id },
        _count: { _all: true }
    });

    console.log("July Leads by assignment:", leads);
    
    const midu = await prisma.user.findFirst({
        where: { firstName: { contains: 'midu' } }
    });
    console.log("Midu user details:", midu.id, midu.firstName, midu.lastName);
    
    // Check if Midu has any leads across all batches
    const miduLeads = await prisma.lead.groupBy({
        by: ['batchId', 'inquiryType'],
        where: { assignedTo: midu.id },
        _count: { _all: true }
    });
    console.log("Midu Leads by batch:", miduLeads);
}
main().catch(console.error).finally(() => prisma.$disconnect());
