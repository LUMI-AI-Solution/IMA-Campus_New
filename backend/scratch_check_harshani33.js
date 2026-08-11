const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const allGroups = await prisma.lead.groupBy({
        by: ['batchId', 'campaignType', 'inquiryType', 'callStatus', 'source', 'assignedTo'],
        where: { assignedTo: 49 },
        _count: { id: true }
    });
    console.log("Groups with ~81 leads:");
    console.log(allGroups.filter(g => g._count.id > 70 && g._count.id < 90));
}
main().catch(console.error).finally(() => prisma.$disconnect());
