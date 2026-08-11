const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const user = await prisma.user.findUnique({ where: { id: 1 } });
    console.log(user);
}
main();
