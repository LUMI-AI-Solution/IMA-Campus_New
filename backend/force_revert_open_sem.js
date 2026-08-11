const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // We want to find leads updated in the last 15 minutes to NEW_INQ
    // and move them back to OPEN_SEMINAR if campaignType is AFTER_SEMINAR.
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
    
    const leads = await prisma.lead.findMany({
        where: { 
            inquiryType: 'NEW_INQ', 
            campaignType: 'AFTER_SEMINAR',
            updatedAt: { gte: fifteenMinsAgo }
        }
    });
    
    let updatedCount = 0;
    for (const l of leads) {
        await prisma.lead.update({
            where: { id: l.id },
            data: { inquiryType: 'OPEN_SEMINAR' }
        });
        updatedCount++;
    }
    console.log(`Force reverted ${updatedCount} leads back to OPEN_SEMINAR based on timestamp.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
