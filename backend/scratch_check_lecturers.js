const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBatch() {
    const b20 = await prisma.batch.findUnique({ where: { id: 20 } });
    const b41 = await prisma.batch.findUnique({ where: { id: 41 } });
    
    console.log("Batch 20 lecturers:", b20.lecturers);
    console.log("Batch 41 lecturers:", b41.lecturers);
}

checkBatch().catch(console.error).finally(() => prisma.$disconnect());
