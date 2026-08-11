const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const leads = await prisma.lead.findMany({
        where: {
            inquiryType: 'NEW_INQ',
            coordinationRound: 1,
            callStatus: 'answered'
        }
    });
    console.log(`Found ${leads.length} leads stuck in Round 1!`);
    
    if (leads.length > 0) {
        for (const lead of leads) {
            console.log(`Fixing lead ${lead.id}...`);
            await prisma.$transaction([
                prisma.lead.update({
                    where: { id: lead.id },
                    data: {
                        coordinationRound: 2,
                        phase: 1,
                        callStatus: 'pending',
                        callAttempt: 1
                    }
                }),
                prisma.leadRoundProgress.create({
                    data: {
                        leadId: lead.id,
                        roundNum: 1
                    }
                })
            ]);
        }
        console.log("All fixed!");
    }
}
run();
