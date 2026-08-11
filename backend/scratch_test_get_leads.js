const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    try {
        const bizBatches = await prisma.batch.findMany({ where: { businessId: 17 }, select: { id: true } });
        const leads = await prisma.lead.findMany({
            where: {
                campaignType: 'AFTER_SEMINAR',
                AND: [
                    {
                        OR: [
                            { batchId: { in: bizBatches.map(b => b.id) } }
                        ]
                    }
                ]
            }
        });
        console.log("Leads found:", leads.length);
        
        // Wait, what if the lead has batchId: null?
        const nullBatchLeads = await prisma.lead.findMany({
            where: { phone: { contains: "BIZ_17" } }
        });
        console.log("Leads with BIZ_17 in phone:", nullBatchLeads.length);
    } catch(e) {
        console.error(e);
    }
}
main();
