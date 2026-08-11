const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const msg = await prisma.chatMessage.findFirst({
      where: { metaMessageId: 'wamid.HBgLOTQ3MTQ5NDE1NTkVAgASGBQzQTkyQUE2OUI0QUJBOUYxMUMyNQA=' }
  });
  console.log(msg);
}
main().finally(() => prisma.$disconnect());
