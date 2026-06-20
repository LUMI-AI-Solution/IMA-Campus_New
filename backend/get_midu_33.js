const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function check() {
    const miduId = 33;

    const totalMidu = await prisma.lead.count({
        where: {
            campaignType: 'AFTER_SEMINAR',
            // removed source filter
            assignedTo: miduId,
            NOT: {
                AND: [
                    { source: 'bridge_transfer' },
                    { lastMessage: null }
                ]
            }
        }
    });

    console.log("Total leads assigned to Midu 33:", totalMidu);
}
check().finally(() => prisma.$disconnect());
