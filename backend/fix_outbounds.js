const fs = require('fs');
const readline = require('readline');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Reading log file...");
    const fileStream = fs.createReadStream('/root/.pm2/logs/ima-backend-out.log');
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const outboundCallIds = new Set();
    const regex = /\[WhatsApp Outbound Call Logged\] Record created\/updated for callId: ([^,]+)/;
    const oldRegex = /\[WhatsApp Outbound Call Logged\] Record created for callId: ([^,]+)/;

    for await (const line of rl) {
        let match = line.match(regex);
        if (!match) match = line.match(oldRegex);
        if (match && match[1]) {
            outboundCallIds.add(match[1].trim());
        }
    }

    console.log(`Found ${outboundCallIds.size} unique outbound call IDs from logs.`);

    const callIdsArray = Array.from(outboundCallIds);
    
    // Process in batches if there are many
    const batchSize = 100;
    let totalUpdated = 0;
    
    for (let i = 0; i < callIdsArray.length; i += batchSize) {
        const batch = callIdsArray.slice(i, i + batchSize);
        const res = await prisma.whatsAppCallRecord.updateMany({
            where: {
                callId: { in: batch },
                direction: 'INBOUND'
            },
            data: {
                direction: 'OUTBOUND'
            }
        });
        totalUpdated += res.count;
    }

    console.log(`Successfully updated ${totalUpdated} records from INBOUND to OUTBOUND.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
