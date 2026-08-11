const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const leads = await prisma.lead.findMany({
        where: { phone: { contains: '94702975265' } },
        select: { id: true, phone: true, batchId: true, inquiryType: true }
    });
    console.log(leads);
}
main().finally(() => prisma.$disconnect());
