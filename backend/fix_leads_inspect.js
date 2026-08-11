const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.findMany({
        where: { 
            campaignType: 'FREE_SEMINAR',
            phase: { gt: 1 },
            callStatus: { not: 'pending' }
        },
        select: {
            callStatus: true,
            phase: true
        }
    });
    const counts = {};
    for (const l of leads) {
        const key = `${l.phase}-${l.callStatus}`;
        counts[key] = (counts[key] || 0) + 1;
    }
    console.log(counts);
}
main();
