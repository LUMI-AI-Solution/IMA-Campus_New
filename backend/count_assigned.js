const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const logs = await prisma.$queryRaw`
        SELECT id, endpoint, payload, createdAt, userId
        FROM SystemAuditLog
        WHERE payload LIKE '%40%' 
          AND method IN ('POST', 'PUT', 'PATCH')
          AND endpoint LIKE '%assign-leads-batch%'
        ORDER BY createdAt DESC
    `;
    
    let totalLeadsAssigned = 0;
    for (const log of logs) {
        if (typeof log.payload === 'string') {
            log.payload = JSON.parse(log.payload);
        }
        if (log.payload && log.payload.targetBatchId == '40' && Array.isArray(log.payload.leadIds)) {
            totalLeadsAssigned += log.payload.leadIds.length;
            console.log(`Log ID: ${log.id}, User: ${log.userId}, Date: ${log.createdAt}, Leads count: ${log.payload.leadIds.length}`);
        }
    }
    console.log(`Total leads assigned to batch 40 using assign-leads-batch: ${totalLeadsAssigned}`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
