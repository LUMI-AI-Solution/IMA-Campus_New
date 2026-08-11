const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const artBusiness = await prisma.business.findFirst({
        where: { name: { contains: 'Art' } }
    });

    const midu = await prisma.user.findFirst({
        where: { firstName: { contains: 'midu' } }
    });

    const julyBatch = await prisma.batch.findFirst({
        where: { businessId: artBusiness?.id, name: { contains: 'July' } }
    });
    
    console.log("July Batch ID:", julyBatch?.id);

    // Check leads assigned to Midu for July batch
    const leads = await prisma.lead.findMany({
        where: {
            assignedTo: midu.id,
            batchId: julyBatch.id
        }
    });

    console.log(`Total Leads assigned to Midu for July: ${leads.length}`);
    
    const byInquiryType = await prisma.lead.groupBy({
        by: ['inquiryType', 'enrollmentStatus'],
        where: {
            assignedTo: midu.id,
            batchId: julyBatch.id
        },
        _count: { _all: true }
    });
    
    console.log("Breakdown:", byInquiryType);
}
main().catch(console.error).finally(() => prisma.$disconnect());
