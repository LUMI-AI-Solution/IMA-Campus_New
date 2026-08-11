const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    try {
        const callId = "wacid.IRggRTFCMzZDQzgzNzg1NjMzQjgzRjg1MjJGMTg0NDM0Q0IcGAs5NDc3NDI4OTAzMBUCABUEAA==";
        const record = await prisma.whatsAppCallRecord.upsert({
            where: { callId: callId },
            update: { recordingUrl: 'test.webm' },
            create: { 
                callId: callId,
                recordingUrl: 'test.webm',
                duration: 42,
                direction: "OUTBOUND",
                leadPhone: "94722882344",
                agentId: 180,
                status: "COMPLETED"
            }
        });
        console.log("Upsert succeeded", record);
    } catch (e) {
        console.error("Upsert failed:", e);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
