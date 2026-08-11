const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const reply = await prisma.autoReply.findUnique({ where: { id: 67 } });
  console.log(reply);
}
main().finally(() => prisma.$disconnect());
