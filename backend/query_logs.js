const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const logs = await prisma.$queryRaw`
        SELECT id, endpoint, payload, createdAt, userId
        FROM SystemAuditLog
        WHERE payload LIKE '%40%' 
          AND method IN ('POST', 'PUT', 'PATCH')
          AND endpoint LIKE '%batch%'
        ORDER BY createdAt DESC
        LIMIT 20
    `;
    console.log(logs);
}
main().catch(console.error).finally(() => prisma.$disconnect());
