const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const batches = await prisma.batch.findMany({ where: { businessId: 17 } });
    console.log(batches);
}
main();
