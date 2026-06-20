const fs = require('fs');
const path = '/root/IMA-Campus/backend/controllers/contentController.js';
let content = fs.readFileSync(path, 'utf8');

const replacement = `const getZoomDirectMp4Link = async (meetingId) => {
    const cleanMeetingId = meetingId.replace(/\\s+/g, '');
    console.log(\`\\n================ ZOOM DEBUG START ================\`);
    console.log(\`[1] Requested Meeting ID: "\${cleanMeetingId}" (Original: "\${meetingId}")\`);

    try {
        let zoomAccounts = [];
        try {
            zoomAccounts = await prisma.zoomAccount.findMany({ where: { isActive: true } });
        } catch (e) {
            console.error("[!] Error fetching zoom accounts from DB:", e);
        }

        // If no accounts in DB, fallback to .env
        if (zoomAccounts.length === 0) {
            zoomAccounts.push({
                name: 'Default ENV Account',
                accountId: process.env.ZOOM_ACCOUNT_ID,
                clientId: process.env.ZOOM_CLIENT_ID,
                clientSecret: process.env.ZOOM_CLIENT_SECRET
            });
        }

        for (const account of zoomAccounts) {
            console.log(\`[>>] Trying Account: \${account.name || 'Unknown'}\`);
            if (!account.accountId || !account.clientId || !account.clientSecret) {
                console.error(\`[!] Missing credentials for account: \${account.name}\`);
                continue;
            }

            try {
                const authHeader = Buffer.from(\`\${account.clientId}:\${account.clientSecret}\`).toString('base64');
                const tokenRes = await axios.post(\`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=\${account.accountId}\`, null, {
                    headers: { 'Authorization': \`Basic \${authHeader}\` }
                });

                const accessToken = tokenRes.data.access_token;
                
                // Try fetching recording
                const recRes = await axios.get(\`https://api.zoom.us/v2/meetings/\${cleanMeetingId}/recordings\`, {
                    headers: { 'Authorization': \`Bearer \${accessToken}\` },
                    validateStatus: function (status) { return status < 500; } // Don't throw error on 404
                });

                if (recRes.status === 200 && recRes.data && recRes.data.recording_files) {
                    const mp4File = recRes.data.recording_files.find(file => file.file_type === 'MP4');
                    if (mp4File) {
                        console.log(\`[✔] MP4 Found in account \${account.name}! Size: \${(mp4File.file_size / (1024*1024)).toFixed(2)} MB\`);
                        console.log(\`================ ZOOM DEBUG END ================\\n\`);
                        return \`\${mp4File.download_url}?access_token=\${accessToken}\`;
                    }
                } else if (recRes.status === 404) {
                    console.log(\`[x] Recording not found in \${account.name}, trying next...\`);
                } else {
                    console.log(\`[!] Unexpected status \${recRes.status} from \${account.name}\`);
                }
            } catch (innerError) {
                console.error(\`[!] Error fetching from account \${account.name}:\`, innerError.message);
            }
        }
        
        console.log(\`[!] Error: MP4 not found in any available Zoom accounts.\`);
        console.log(\`================ ZOOM DEBUG END ================\\n\`);
        return null;
    } catch (error) {
        console.error(\`[!] SYSTEM ERROR in getZoomDirectMp4Link:\`, error.message);
        console.log(\`================ ZOOM DEBUG END ================\\n\`);
        return null;
    }
};`;

// Use simple string splitting instead of regex
const startMarker = 'const getZoomDirectMp4Link = async (meetingId) => {';
const endMarker = 'const getTypeInt = (typeStr) => {';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    const newContent = content.substring(0, startIndex) + replacement + '\n\n' + content.substring(endIndex);
    fs.writeFileSync(path, newContent, 'utf8');
    console.log("Successfully replaced getZoomDirectMp4Link");
} else {
    console.log("Could not find markers.");
}
