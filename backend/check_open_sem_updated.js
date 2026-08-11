const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.findMany({
        where: { batchId: 40, inquiryType: 'OPEN_SEMINAR' },
        select: { id: true, createdAt: true, updatedAt: true, source: true },
        take: 5
    });
    console.log(leads);
}
main().catch(console.error).finally(() => prisma.$disconnect());
