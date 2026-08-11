const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
    const user = await prisma.user.findFirst({ where: { firstName: { contains: 'Midu' } } });
    console.log(user ? `ID: ${user.id}, businessType: ${user.businessType}` : "Not found");
}
run();
