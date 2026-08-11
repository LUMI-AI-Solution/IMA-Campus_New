const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const logs = await prisma.systemAuditLog.findMany({
        where: {
            endpoint: { contains: "update-batch" },
            createdAt: { gte: new Date('2026-07-19') } // Since batch 40 creation
        }
    });

    let count40 = 0;
    let users = new Set();
    
    for (const log of logs) {
        let payload = log.payload;
        if (typeof payload === 'string') {
            payload = JSON.parse(payload);
        }
        if (payload && (payload.batchId == '40' || payload.batchId == 40)) {
            count40++;
            users.add(log.userId);
        }
    }
    console.log(`Total update-batch logs for batch 40: ${count40}`);
    console.log(`User IDs involved:`, Array.from(users));
}
main().catch(console.error).finally(() => prisma.$disconnect());
