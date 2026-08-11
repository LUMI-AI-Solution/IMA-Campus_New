const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const logs = await prisma.systemAuditLog.findMany({
        where: {
            endpoint: { contains: "assign-leads-batch" }
        },
        orderBy: { createdAt: 'desc' }
    });

    let totalBulkAssigned = 0;
    for (const log of logs) {
        let payload = log.payload;
        if (typeof payload === 'string') payload = JSON.parse(payload);
        if (payload && (payload.targetBatchId == '40' || payload.targetBatchId == 40)) {
            let count = Array.isArray(payload.leadIds) ? payload.leadIds.length : 0;
            console.log(`User ${log.userId} assigned ${count} leads in bulk on ${log.createdAt}`);
            totalBulkAssigned += count;
        }
    }
    console.log(`Total bulk assigned: ${totalBulkAssigned}`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
