const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const properties = await prisma.lead.groupBy({
        by: ['status', 'callStatus', 'source', 'phase'],
        where: { assignedTo: 49, batchId: 26 },
        _count: { id: true }
    });
    console.log(properties);
}
main().catch(console.error).finally(() => prisma.$disconnect());
