const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
    const group = await prisma.group.findUnique({ where: { id: 10 } });
    console.log(group);
}
run();
