const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const user = await prisma.user.findUnique({ where: { phone: '0777123456' } });
  console.log("User:", user);
}
check();
