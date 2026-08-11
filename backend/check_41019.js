const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const lead = await prisma.lead.findUnique({
        where: { id: 41019 },
        include: { roundProgress: { orderBy: { createdAt: 'desc' } } }
    });
    
    console.log("Lead 41019 details:");
    console.log(`coordinationRound: ${lead.coordinationRound}`);
    console.log(`openSemRound: ${lead.openSemRound}`);
    console.log(`openSemCallStatus: ${lead.openSemCallStatus}`);
    
    lead.roundProgress.forEach(p => {
        console.log(`Progress: category=${p.campaignCategory}, round=${p.roundNum}, status=${p.callStatus}`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
