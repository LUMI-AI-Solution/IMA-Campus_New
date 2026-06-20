const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkHistory() {
    try {
        const phone = "94713839496";
        
        const lead = await prisma.lead.findFirst({
            where: { phone: { contains: "713839496" } }
        });
        console.log("Lead created at:", lead?.createdAt);

        const logs = await prisma.webhookLog.findMany({
            where: { phone: { contains: "713839496" } }
        });
        console.log("Webhook Logs:", JSON.stringify(logs, null, 2));

        const messages = await prisma.chatMessage.findMany({
            where: { leadId: lead?.id }
        });
        console.log("Messages for lead:", JSON.stringify(messages, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkHistory();
