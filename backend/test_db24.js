const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const msgs = await prisma.chatMessage.findMany({
      where: { leadId: 64501 }
  });
  console.log(msgs.map(m => ({ id: m.id, dir: m.direction, msg: m.message, metaId: m.metaMessageId, ts: m.createdAt })));
}
main().finally(() => prisma.$disconnect());
