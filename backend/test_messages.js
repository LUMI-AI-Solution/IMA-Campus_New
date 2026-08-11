const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const messages = await prisma.chatMessage.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  console.log(messages);
}
run();
