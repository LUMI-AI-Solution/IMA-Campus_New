const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.findMany({
        where: { assignedTo: 49 },
        orderBy: { updatedAt: 'desc' },
        take: 10
    });
    console.log("Most recently updated leads for Harshani:");
    leads.forEach(l => {
        console.log(`Lead ${l.id} - batchId: ${l.batchId}, campaignType: ${l.campaignType}, inquiryType: ${l.inquiryType}, updatedAt: ${l.updatedAt}`);
    });
}
main().catch(console.error).finally(() => prisma.$disconnect());
