const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const leads = await prisma.lead.findMany({
        where: {
            inquiryType: 'NEW_INQ',
            coordinationRound: 1,
            callStatus: { not: 'pending' }
        }
    });
    console.log(`Found ${leads.length} covered leads in Round 1!`);
}
run();
