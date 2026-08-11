const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const msgs = await prisma.chatMessage.findMany({ where: { leadId: 64501 }, orderBy: { createdAt: 'desc' }, take: 5 });
  console.log(msgs);
}
main().finally(() => prisma.$disconnect());
