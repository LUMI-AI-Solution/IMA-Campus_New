const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixCrossBusinessBatches() {
    console.log("🚀 Starting Cross-Business Batch Fix Script...");

    try {
        // Fetch all leads with a batch assigned
        const leads = await prisma.lead.findMany({
            where: {
                batchId: { not: null },
                phone: { contains: '_BIZ_' }
            },
            include: {
                batch: true
            }
        });

        let fixCount = 0;

        for (const lead of leads) {
            const match = lead.phone.match(/_BIZ_(\d+)/);
            if (!match) continue;

            const leadBizId = parseInt(match[1]);

            // If the batch belongs to a DIFFERENT business than the lead, reset it
            if (lead.batch && lead.batch.businessId !== leadBizId) {
                console.log(`❌ Mismatch found! Lead ID: ${lead.id} | Phone: ${lead.phone} | Lead Biz: ${leadBizId} | Batch Biz: ${lead.batch.businessId}`);
                
                await prisma.lead.update({
                    where: { id: lead.id },
                    data: { batchId: null }
                });
                
                fixCount++;
            }
        }

        console.log(`\n✅ Finished! Successfully reset batchId for ${fixCount} misassigned leads.`);
    } catch (error) {
        console.error("❌ Error running fix script:", error);
    } finally {
        await prisma.$disconnect();
    }
}

fixCrossBusinessBatches();
