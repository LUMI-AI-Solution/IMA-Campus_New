const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function check() {
    const midu = await prisma.user.findFirst({ where: { firstName: { contains: 'Midu' } } });
    if (!midu) return console.log("Not found");
    const miduId = midu.id;
    console.log("Midu ID:", miduId);

    // EXACT query from After Seminar CRM (no batchId or bizId filter, to see total Midu leads)
    const totalMidu = await prisma.lead.count({
        where: {
            campaignType: 'AFTER_SEMINAR',
            source: { not: 'system' },
            assignedTo: miduId,
            NOT: {
                AND: [
                    { source: 'bridge_transfer' },
                    { lastMessage: null }
                ]
            }
        }
    });

    console.log("Total leads assigned to Midu (no business filter):", totalMidu);
}
check().finally(() => prisma.$disconnect());
