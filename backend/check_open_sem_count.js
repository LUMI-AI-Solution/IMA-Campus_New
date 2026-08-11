const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const count = await prisma.lead.count({
        where: {
            updatedAt: {
                gte: new Date('2026-08-09T00:09:00.000Z'),
                lte: new Date('2026-08-09T00:11:00.000Z')
            },
            batchId: 40,
            inquiryType: 'OPEN_SEMINAR'
        }
    });
    console.log(`Leads updated to Open Seminar today at 00:10 UTC: ${count}`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
