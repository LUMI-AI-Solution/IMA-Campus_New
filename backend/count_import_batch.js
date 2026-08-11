const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const logs = await prisma.systemAuditLog.findMany({
        where: {
            endpoint: { contains: "import" },
            createdAt: { gte: new Date('2026-07-19') } // Since batch 40 creation
        }
    });

    for (const log of logs) {
        let payload = log.payload;
        if (typeof payload === 'string') {
            try { payload = JSON.parse(payload); } catch(e) {}
        }
        
        if (payload) {
            const str = JSON.stringify(payload);
            if (str.includes('"batchId":40') || str.includes('"batchId":"40"')) {
                console.log(`Import log found! Date: ${log.createdAt}, User: ${log.userId}`);
            }
        }
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
