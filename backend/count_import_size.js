const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.count({
        where: {
            batchId: 40,
            source: 'import',
            createdAt: { gte: new Date('2026-08-04') }
        }
    });
    console.log("Imported leads in Batch 40 since Aug 4:", leads);
    
    // Also check leads created around that time without source restriction
    const allRecent = await prisma.lead.count({
        where: {
            batchId: 40,
            createdAt: { gte: new Date('2026-08-05'), lt: new Date('2026-08-06') }
        }
    });
    console.log("All leads created in Batch 40 on Aug 5:", allRecent);
}
main().catch(console.error).finally(() => prisma.$disconnect());
