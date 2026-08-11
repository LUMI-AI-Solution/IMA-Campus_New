const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.groupBy({
        by: ['batchId', 'campaignType', 'inquiryType'],
        where: { assignedTo: 49 },
        _count: { id: true }
    });
    console.log("=== ALL LEADS FOR HARSHANI ===");
    console.log(leads);
}
main().catch(console.error).finally(() => prisma.$disconnect());
