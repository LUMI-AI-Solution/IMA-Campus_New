const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const batch = await prisma.batch.findFirst({ where: { name: { contains: '2027 Tech May Batch' } } });
    if (!batch) return console.log("Batch not found");
    
    const count = await prisma.lead.count({
        where: { batchId: batch.id, campaignType: 'AFTER_SEMINAR', inquiryType: 'PAID_CAMP' }
    });
    console.log(`Leads marked as PAID_CAMP in CRM: ${count}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
