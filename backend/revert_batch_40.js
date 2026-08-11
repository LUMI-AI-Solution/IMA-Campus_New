const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Find leads in batch 40 that were created before the batch was created (July 19, 2026)
    const batch40 = await prisma.batch.findUnique({ where: { id: 40 } });
    if (!batch40) return console.log("Batch not found");

    const leadsToRevert = await prisma.lead.findMany({
        where: {
            batchId: 40,
            createdAt: { lt: batch40.createdAt }
        }
    });

    console.log(`Found ${leadsToRevert.length} older leads incorrectly assigned to August Batch.`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
