const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const logs = await prisma.$queryRaw`
        SELECT endpoint, userId, COUNT(id) as c
        FROM SystemAuditLog
        WHERE payload LIKE '%"batchId":40%' OR payload LIKE '%"batchId":"40"%' OR payload LIKE '%"targetBatchId":"40"%' OR payload LIKE '%"targetBatchId":40%'
        GROUP BY endpoint, userId
        ORDER BY c DESC
    `;
    
    // We need to parse BigInt counts for console.log
    const parsedLogs = logs.map(l => ({
        endpoint: l.endpoint,
        userId: l.userId,
        count: Number(l.c)
    }));

    console.log(parsedLogs);
}
main().catch(console.error).finally(() => prisma.$disconnect());
