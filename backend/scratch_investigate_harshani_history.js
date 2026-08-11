const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leadsByHarshani = await prisma.lead.findMany({
        where: { batchId: 26, campaignType: 'AFTER_SEMINAR', inquiryType: 'OPEN_SEMINAR',
            roundProgress: { some: { lead: { batchId: 26 } } } // Just fetching to see if we can find any trace
        },
        include: { roundProgress: true }
    });
    
    // We want to find if Harshani ever updated these leads
    // Wait, roundProgress doesn't store staffId! 
    // Is there a CallLog or LeadHistory table?
    console.log(Object.keys(prisma));
}
main().catch(console.error).finally(() => prisma.$disconnect());
