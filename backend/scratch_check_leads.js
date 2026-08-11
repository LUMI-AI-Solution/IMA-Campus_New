const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.findMany({
        where: {
            inquiryType: 'OPEN_SEMINAR',
            batch: {
                name: { contains: '2027' }
            }
        },
        include: {
            batch: true
        }
    });

    // Group to find "292"
    const groups = {};
    leads.forEach(l => {
        const key = `${l.batch?.name || 'No Batch'} (Round: ${l.coordinationRound})`;
        groups[key] = (groups[key] || 0) + 1;
    });
    console.log(groups);
}

main().catch(console.error).finally(() => prisma.$disconnect());
