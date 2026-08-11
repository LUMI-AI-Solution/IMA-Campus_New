const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const leads = await prisma.lead.findMany({
        where: {
            inquiryType: 'OPEN_SEMINAR',
            batchId: 26,
            coordinationRound: 1,
        }
    });
    console.log("Total R1 in batch 26:", leads.length);
}
main().catch(console.error).finally(() => prisma.$disconnect());
