const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const logs = await prisma.systemAuditLog.findMany({
        where: {
            method: { in: ['POST', 'PUT', 'PATCH'] }
        },
        orderBy: { createdAt: 'desc' },
        take: 5000
    });

    const relevantLogs = logs.filter(log => {
        if (!log.payload) return false;
        const payloadStr = JSON.stringify(log.payload);
        return payloadStr.includes('"40"') || payloadStr.includes('40') || payloadStr.includes('batch');
    });

    console.log(`Found ${relevantLogs.length} potential assignment logs.`);
    for (const log of relevantLogs.slice(0, 5)) {
        console.log(`ID: ${log.id}, Endpoint: ${log.endpoint}, Date: ${log.createdAt}, Payload: ${JSON.stringify(log.payload)}`);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
