const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const logs = await prisma.systemAuditLog.findMany({
        where: {
            endpoint: { contains: "assign-leads-batch" }
        },
        take: 20
    });

    const relevantLogs = logs.filter(log => {
        if (!log.payload) return false;
        const payloadStr = JSON.stringify(log.payload);
        return payloadStr.includes('40');
    });

    console.log(`Found ${relevantLogs.length} logs for batch 40 assignment.`);
    for (const log of relevantLogs.slice(0, 5)) {
        console.log(`ID: ${log.id}, UserID: ${log.userId}, Date: ${log.createdAt}, Payload: ${JSON.stringify(log.payload)}`);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
