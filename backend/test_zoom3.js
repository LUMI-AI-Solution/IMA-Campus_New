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
    for (const account of accounts) {
        const tokenToken = Buffer.from(`${account.clientId}:${account.clientSecret}`).toString('base64');
        try {
            const tokenRes = await axios.post(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${account.accountId}`, {}, {
                headers: { 'Authorization': `Basic ${tokenToken}` }
            });
            const accessToken = tokenRes.data.access_token;
            const recRes = await axios.get(`https://api.zoom.us/v2/meetings/${meetingId}/recordings`, {
                headers: { 'Authorization': `Bearer ${accessToken}` },
                validateStatus: function (status) { return status < 500; }
            });
            if (recRes.status === 200 && recRes.data && recRes.data.recording_files) {
                console.log(`[✔] Found in ${account.name} (Status: ${recRes.status})`);
                for (let f of recRes.data.recording_files) {
                    if(f.file_type === 'MP4') {
                        console.log(`    -> MP4: ${f.recording_start}, Size: ${(f.file_size / (1024*1024)).toFixed(2)} MB`);
                    }
                }
            } else {
                console.log(`[x] ${account.name} returned ${recRes.status}`);
                if (recRes.status !== 404) console.log(recRes.data);
            }
        } catch(e) {
            console.log(`[!] ${account.name} error:`, e.response ? e.response.data : e.message);
        }
    }
}
test().then(()=>process.exit(0)).catch(console.error);
