const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function searchUserNumber() {
    const rawNum = "761083012";
    console.log(`=== Searching for number: ${rawNum} ===\n`);

    // 1. Users
    const users = await prisma.user.findMany({
        where: {
            OR: [
                { phone: { contains: rawNum } },
                { whatsapp: { contains: rawNum } },
                { optionalPhone: { contains: rawNum } }
            ]
        }
    });
    console.log("1. Users found:", JSON.stringify(users, null, 2));

    // 2. Leads
    const leads = await prisma.lead.findMany({
        where: {
            phone: { contains: rawNum }
        },
        include: {
            messages: {
                orderBy: { id: 'desc' },
                take: 10
            }
        }
    });
    console.log("\n2. Leads found:", JSON.stringify(leads, null, 2));

    // 3. ChatMessages
    const msgs = await prisma.chatMessage.findMany({
        where: {
            OR: [
                { lead: { phone: { contains: rawNum } } },
                { senderName: { contains: rawNum } }
            ]
        },
        orderBy: { id: 'desc' },
        take: 10
    });
    console.log("\n3. ChatMessages found:", JSON.stringify(msgs, null, 2));

    // 4. Webhook Logs
    const webhookLogs = await prisma.webhookLog.findMany({
        where: {
            OR: [
                { phone: { contains: rawNum } },
                { message: { contains: rawNum } },
                { errorMsg: { contains: rawNum } }
            ]
        }
    });
    console.log("\n4. WebhookLogs found:", JSON.stringify(webhookLogs, null, 2));

    // 5. Check in PM2 logs
    try {
        const pm2Log = fs.readFileSync('/root/.pm2/logs/ima-backend-out.log', 'utf8');
        const matches = pm2Log.split('\n').filter(l => l.includes(rawNum));
        console.log(`\n5. PM2 log occurrences of ${rawNum}:`, matches);
    } catch (e) {
        console.log("PM2 log error:", e.message);
    }

    // 6. Check in Nginx log
    try {
        const nginxLog = fs.readFileSync('/var/log/nginx/access.log', 'utf8');
        const matches = nginxLog.split('\n').filter(l => l.includes(rawNum));
        console.log(`\n6. Nginx log occurrences of ${rawNum}:`, matches);
    } catch (e) {
        console.log("Nginx log error:", e.message);
    }
}

searchUserNumber().catch(console.error).finally(() => prisma.$disconnect());
