require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const axios = require('axios');

async function test() {
    const content = await prisma.content.findUnique({where: {id: 124}});
    const meetingId = content.meetingId.replace(/\D/g, '');
    const targetDate = content.date;
    
    console.log("Meeting ID:", meetingId, "Date:", targetDate);
    
    const accounts = await prisma.zoomAccount.findMany({ where: { isActive: true } });
    if (accounts.length === 0) {
        console.log("No zoom accounts found in DB, using ENV");
        accounts.push({
            name: "ENV Account",
            accountId: process.env.ZOOM_ACCOUNT_ID,
            clientId: process.env.ZOOM_CLIENT_ID,
            clientSecret: process.env.ZOOM_CLIENT_SECRET
        });
    }

    for (const account of accounts) {
        console.log(`Checking account ${account.name}...`);
        console.log(`AccId: ${account.accountId}, ClientId: ${account.clientId}`);
        const tokenToken = Buffer.from(`${account.clientId}:${account.clientSecret}`).toString('base64');
        try {
            const tokenRes = await axios.post(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${account.accountId}`, {}, {
                headers: { 'Authorization': `Basic ${tokenToken}` }
            });
            console.log("Token success!");
        } catch(e) {
            console.log("Token error:", e.response ? e.response.data : e.message);
        }
    }
}
test().then(()=>process.exit(0)).catch(console.error);
