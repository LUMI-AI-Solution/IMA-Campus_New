const fs = require('fs');
const content = `

exports.startScheduledBulkVerification = async (queueType) => {
    if (bulkState.isRunning) {
        console.log("[AI-Scheduler] Bulk verification already running, skipping scheduled run.");
        return;
    }
    try {
        console.log(\`[AI-Scheduler] Fetching all pending slips for queue: \${queueType}\`);
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        
        const pendingSlips = await prisma.payment.findMany({
            where: {
                status: 'pending'
            },
            include: { student: true, course: true }
        });
        
        if (pendingSlips.length === 0) {
            console.log(\`[AI-Scheduler] No pending slips found for \${queueType}.\`);
            return;
        }
        
        console.log(\`[AI-Scheduler] Found \${pendingSlips.length} pending slips. Starting process...\`);
        bulkState.isRunning = true;
        bulkState.shouldStop = false;
        bulkState.processed = 0;
        bulkState.total = pendingSlips.length;
        bulkState.logs = [\`Started scheduled verification (\${queueType}) for \${pendingSlips.length} slips.\`];
        
        // Wrap logic in an async IIFE to process in background
        (async () => {
            try {
                // Here we would typically loop through pendingSlips and process them.
                // Since this is just a mocked execution logic that runs over time:
                for (let i = 0; i < pendingSlips.length; i++) {
                    if (bulkState.shouldStop) {
                        bulkState.logs.push("Bulk verification stopped by schedule run.");
                        break;
                    }
                    
                    const slip = pendingSlips[i];
                    bulkState.logs.push(\`Processing scheduled slip [\${slip.id}] Rs. \${slip.amount}\`);
                    
                    // Simulate delay of AI processing
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    bulkState.processed++;
                }
            } catch(e) {
                console.error("Scheduled run error", e);
            } finally {
                bulkState.isRunning = false;
                console.log("[AI-Scheduler] Scheduled run completed.");
            }
        })();
        
    } catch(err) {
        console.error("Error starting scheduled verification:", err);
    }
};
`;
fs.appendFileSync('/root/IMA-Campus/backend/controllers/aiVerificationController.js', content);
console.log("Appended successfully");
