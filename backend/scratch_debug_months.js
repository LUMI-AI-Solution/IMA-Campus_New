const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
    const batchId = 8; // I need to find the batch id for 2027 MAY INTAKE
    const batches = await prisma.batch.findMany({ where: { name: { contains: '2027 MAY INTAKE' } } });
    if(batches.length > 0) {
        console.log("Found batch:", batches[0].id, batches[0].name);
        const allGroups = await prisma.group.findMany({
            where: { batchId: batches[0].id },
            orderBy: { itemOrder: 'asc' }
        });
        const monthlyGroupsRaw = allGroups.filter(g => !g.name.toLowerCase().includes('full'));
        console.log("Monthly Groups Raw:", monthlyGroupsRaw.map(g => g.name));
    }
}
run().catch(console.log).finally(() => prisma.$disconnect());
