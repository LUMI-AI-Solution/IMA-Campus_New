const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const businesses = await prisma.business.findMany();
    console.log(businesses.map(b => ({ id: b.id, name: b.name, waPhoneNumberId: b.waPhoneNumberId })));
}
run().catch(console.error).finally(() => prisma.$disconnect());
