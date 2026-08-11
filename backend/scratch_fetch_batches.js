const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const batches = await prisma.batch.findMany({});
    console.log("Total batches:", batches.length);
}
run().finally(() => prisma.$disconnect());
