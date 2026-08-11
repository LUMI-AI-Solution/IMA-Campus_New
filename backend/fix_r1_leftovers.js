const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const leadsToPush = await prisma.lead.findMany({
        where: {
            inquiryType: 'NEW_INQ',
            coordinationRound: 1,
            callStatus: { not: 'pending' }
        },
        select: { id: true }
    });
    
    console.log(`Found ${leadsToPush.length} leftovers. Pushing them to Round 2...`);
    
    let count = 0;
    for (const lead of leadsToPush) {
        await prisma.leadRoundProgress.create({
            data: {
                leadId: lead.id,
                roundNum: 1,
                callStatus: 'system_migrated',
                callMethod: 'system',
                callAttempt: 1,
                feedback: 'System auto pushed leftover'
            }
        });
        
        await prisma.lead.update({
            where: { id: lead.id },
            data: {
                coordinationRound: 2,
                phase: 1,
                callStatus: 'pending',
                callAttempt: 1,
                feedback: '',
                callMethod: 'direct'
            }
        });
        count++;
    }
    console.log(`Successfully migrated ${count} leftovers to Round 2.`);
}
run();
