const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const batches = await prisma.batch.findMany();
    for (const b of batches) {
        const count = await prisma.lead.count({
            where: {
                campaignType: 'AFTER_SEMINAR',
                source: { not: 'system' },
                batchId: b.id,
                NOT: {
                    AND: [
                        { source: 'bridge_transfer' },
                        { lastMessage: null }
                    ]
                }
            }
        });
        if (count >= 2000 && count <= 2500) {
            console.log(`BATCH: ${b.id}, Count: ${count}`);
        }
    }

    const businesses = await prisma.business.findMany();
    for (const biz of businesses) {
        const count = await prisma.lead.count({
            where: {
                campaignType: 'AFTER_SEMINAR',
                source: { not: 'system' },
                OR: [
                    { phone: { endsWith: `BIZ_${biz.id}` } },
                    { phone: { endsWith: `BIZ_${biz.id}_AS` } },
                    { phone: { contains: `BIZ_${biz.id}_BATCH_` } },
                    { phone: { contains: `BIZ_${biz.id}_ROUND_` } },
                    { phone: { contains: `BIZ_${biz.id}_HISTORY_ROUND_` } }
                ],
                NOT: {
                    AND: [
                        { source: 'bridge_transfer' },
                        { lastMessage: null }
                    ]
                }
            }
        });
        if (count >= 2000 && count <= 2500) {
            console.log(`BIZ: ${biz.id}, Count: ${count}`);
        }
    }
}

check().catch(console.error).finally(() => prisma.$disconnect());
