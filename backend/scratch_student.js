const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const s1 = await prisma.user.findUnique({ where: { id: 1 } });
    console.log("Student 1 name:", s1.name, s1.email);
}
run().catch(console.error).finally(() => prisma.$disconnect());
