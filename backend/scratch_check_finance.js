const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const f = await prisma.user.findFirst({ where: { department: 'Finance' } });
  console.log(f);
}
run().finally(() => prisma.$disconnect());
