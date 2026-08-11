const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
    const businesses = await prisma.business.findMany();
    console.log(businesses);
}
run();
