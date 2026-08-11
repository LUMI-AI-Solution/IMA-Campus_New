const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const lead = await prisma.lead.findFirst({
        where: { phone: { contains: '94740672302' } },
        include: {
            roundProgress: {
                where: { campaignCategory: 'PAID' },
                orderBy: { roundNum: 'desc' },
                take: 5
            }
        }
    });

    if (!lead) {
        console.log("Lead not found");
        return;
    }
    
    console.log("Lead ID:", lead.id);
    console.log("Paid Round:", lead.paidRound);
    console.log("Round Progresses:", JSON.stringify(lead.roundProgress, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
