const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function check() {
    const batches = await prisma.batch.findMany({ include: { business: true } });
    console.log(batches.map(b => `${b.id}: ${b.name} (Business: ${b.businessId} - ${b.business.name})`));
}
check().finally(() => prisma.$disconnect());
