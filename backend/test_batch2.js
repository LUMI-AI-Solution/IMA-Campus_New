const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const batches = await prisma.batch.findMany({
        where: { name: { contains: '2027' } }
    });
    
    for (const b of batches) {
        if(b.name.includes("අගෝස්තු") || b.name.includes("Commerce") || b.name.includes("වාණිජ්‍ය")) {
            const count = await prisma.lead.count({
                where: { batchId: b.id, campaignType: 'FREE_SEMINAR' }
            });
            console.log(`Batch ${b.id} "${b.name}":`, count, "leads");
        }
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
