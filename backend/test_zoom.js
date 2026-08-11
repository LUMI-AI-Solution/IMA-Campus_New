require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const prisma = new PrismaClient();

async function test() {
    let zoomAccounts = await prisma.zoomAccount.findMany({ where: { isActive: true } });
    const account = zoomAccounts.find(a => a.name === 'Acc 04'); // since we know Acc 04 owns it
    
    const authHeader = Buffer.from(`${account.clientId}:${account.clientSecret}`).toString('base64');
    const tokenRes = await axios.post(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${account.accountId}`, null, {
        headers: { 'Authorization': `Basic ${authHeader}` }
    });
    const token = tokenRes.data.access_token;
    
    // get instances
    const url = `https://api.zoom.us/v2/past_meetings/2160226997/instances`;
    try {
        const recRes = await axios.get(url, { headers: { 'Authorization': `Bearer ${token}` } });
        console.log(`Found ${recRes.data.meetings.length} instances`);
        console.log(recRes.data.meetings);
    } catch(e) {
        console.log("Error:", e.response?.data);
    }
}
test().catch(console.error).finally(() => prisma.$disconnect());
