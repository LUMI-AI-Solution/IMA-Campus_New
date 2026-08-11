const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const chats = await prisma.chatMessage.findMany({
    where: { message: { contains: 'open seminar' } },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { lead: { select: { phone: true, inquiryType: true, assignedTo: true, status: true, updatedAt: true } } }
  });
  console.log("Recent Open Seminar Messages:");
  console.log(JSON.stringify(chats, null, 2));
}
check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
