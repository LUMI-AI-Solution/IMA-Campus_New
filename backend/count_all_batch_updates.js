const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const logs = await prisma.systemAuditLog.findMany({
        where: {
            createdAt: { gte: new Date('2026-07-19') } // Since batch 40 creation
        },
        select: { payload: true, endpoint: true, userId: true, createdAt: true }
    });

    let endpoints = {};
    let count = 0;
    
    for (const log of logs) {
        let payload = log.payload;
        if (typeof payload === 'string') {
            try { payload = JSON.parse(payload); } catch(e) {}
        }
        
        if (payload) {
            let hasBatch40 = false;
            // Check direct assignment
            if (payload.batchId == 40 || payload.batchId == '40') hasBatch40 = true;
            // Check targetBatchId
            if (payload.targetBatchId == 40 || payload.targetBatchId == '40') hasBatch40 = true;
            // Stringify and check just in case it's nested (e.g. array of objects)
            if (!hasBatch40) {
                const str = JSON.stringify(payload);
                if (str.includes('"batchId":40') || str.includes('"batchId":"40"') || str.includes('"targetBatchId":40') || str.includes('"targetBatchId":"40"')) {
                    hasBatch40 = true;
                }
            }
            
            if (hasBatch40) {
                count++;
                endpoints[log.endpoint] = (endpoints[log.endpoint] || 0) + 1;
            }
        }
    }
    console.log(`Total logs involving batch 40 assignment: ${count}`);
    console.log(`Endpoints:`, endpoints);
}
main().catch(console.error).finally(() => prisma.$disconnect());
