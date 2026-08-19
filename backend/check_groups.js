const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const biz = await prisma.business.findFirst({ where: { name: { contains: 'Law' } }});
    const batches = await prisma.batch.findMany({ where: { businessId: biz.id } });
    for (const b of batches) {
        console.log("Batch:", b.id, b.name);
        const groups = await prisma.group.findMany({ where: { batchId: b.id } });
        for (const g of groups) {
            console.log("  Group:", g.id, g.name, "batchId:", g.batchId);
        }
    }
}
check();
