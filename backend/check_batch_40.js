const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.findMany({
        where: { 
            OR: [
                { batchId: 40 },
                { phone: { contains: "_BATCH_40" } }
            ]
        },
        select: { id: true, phone: true, createdAt: true, source: true, batchId: true, inquiryType: true },
        take: 10
    });
    console.log(leads);
}
main().catch(console.error).finally(() => prisma.$disconnect());
