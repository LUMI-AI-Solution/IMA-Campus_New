const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const leads = await prisma.lead.findMany({
        where: {
            inquiryType: 'NEW_INQ',
            coordinationRound: 2
        },
        include: {
            roundProgress: true
        }
    });
    console.log(`Found ${leads.length} leads in Round 2!`);
    if (leads.length > 0) {
        console.log("Sample lead:", JSON.stringify(leads[0], null, 2));
    }
}
run();
