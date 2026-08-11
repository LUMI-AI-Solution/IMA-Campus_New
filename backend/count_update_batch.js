const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const logs = await prisma.$queryRaw`
        SELECT COUNT(id) as count
        FROM SystemAuditLog
        WHERE payload LIKE '%"batchId":"40"%' 
           OR payload LIKE '%"batchId":40%'
          AND endpoint LIKE '%update-batch%'
    `;
    console.log(logs);
}
main().catch(console.error).finally(() => prisma.$disconnect());
