const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const webhookLogs = await prisma.webhookLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log("Recent Webhook Logs:", webhookLogs);
  
  const leads = await prisma.lead.findMany({
    where: { inquiryType: 'OPEN_SEMINAR' },
    orderBy: { updatedAt: 'desc' },
    take: 5,
    select: { phone: true, name: true, inquiryType: true, assignedTo: true, status: true, updatedAt: true }
  });
  console.log("Recent Open Seminar Leads:", leads);

  const chats = await prisma.chatMessage.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { message: true, leadId: true, senderType: true, createdAt: true }
  });
  console.log("Recent Chat Messages:", chats);
}
check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
