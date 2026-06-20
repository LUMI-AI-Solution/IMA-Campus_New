const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
    console.log("Deleting system generated AFTER_SEMINAR leads...");
    
    const result = await prisma.lead.deleteMany({
        where: {
            campaignType: 'AFTER_SEMINAR',
            source: 'system',
            inquiryType: 'PAID_CAMP'
        }
    });

    console.log(`Deleted ${result.count} auto-generated leads.`);
}

fix().catch(console.error).finally(() => prisma.$disconnect());
