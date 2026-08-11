const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const businesses = await prisma.business.findMany();
    console.log(businesses);
}
main().catch(console.error).finally(() => prisma.$disconnect());
