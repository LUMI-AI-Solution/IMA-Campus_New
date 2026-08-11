const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const artBusiness = await prisma.business.findFirst({
        where: { name: { contains: 'Art' } }
    });

    const mayBatch = await prisma.batch.findFirst({
        where: { businessId: artBusiness?.id, name: { contains: 'MAY' } }
    });

    console.log("May Batch ID:", mayBatch?.id);

    const counts = await prisma.lead.groupBy({
        by: ['coordinationRound', 'enrollmentStatus'],
        where: {
            assignedTo: 33, // Midu
            batchId: mayBatch.id,
            inquiryType: 'NEW_INQ'
        },
        _count: { _all: true }
    });
    
    console.log("Midu May New Inquiries Breakdown:");
    console.log(counts);
}
main().catch(console.error).finally(() => prisma.$disconnect());
