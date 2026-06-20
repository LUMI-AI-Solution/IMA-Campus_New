const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const batches = await prisma.batch.findMany();
    for (const b of batches) {
        const count = await prisma.lead.count({
            where: {
                campaignType: 'AFTER_SEMINAR',
                source: { not: 'system' },
                assignedTo: { not: null },
                batchId: b.id,
                NOT: {
                    AND: [
                        { source: 'bridge_transfer' },
                        { lastMessage: null }
                    ]
                }
            }
        });
        if (count === 347) {
            console.log(`FOUND! Batch ID: ${b.id}, Name: ${b.name}`);
        }
    }

    const businesses = await prisma.business.findMany();
    for (const biz of businesses) {
        const count = await prisma.lead.count({
            where: {
                campaignType: 'AFTER_SEMINAR',
                source: { not: 'system' },
                assignedTo: { not: null },
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
        if (count === 347) {
            console.log(`FOUND! Business ID: ${biz.id}, Name: ${biz.name}`);
        }
    }
}

check().catch(console.error).finally(() => prisma.$disconnect());
