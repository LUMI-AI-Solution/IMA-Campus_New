const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const dt = new Date('2026-08-07T11:12:45.652Z');
    
    // Let's just find counts grouped by minute around that time
    const count = await prisma.lead.count({
        where: {
            updatedAt: {
                gte: new Date('2026-08-07T11:12:00.000Z'),
                lte: new Date('2026-08-07T11:13:00.000Z')
            },
            batchId: 40
        }
    });
    console.log(`Leads updated in that minute: ${count}`);
    
    const count2 = await prisma.lead.count({
        where: {
            updatedAt: {
                gte: new Date('2026-08-08T10:20:00.000Z'),
                lte: new Date('2026-08-08T10:21:00.000Z')
            },
            batchId: 40
        }
    });
    console.log(`Leads updated on Aug 8 at 10:20: ${count2}`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
