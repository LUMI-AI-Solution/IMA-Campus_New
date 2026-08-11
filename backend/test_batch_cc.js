const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const batch = await prisma.batch.findFirst({
        where: { name: { contains: '2027 Tech August Batch' } }
    });

    if (batch) {
        console.log("Found Batch:", batch);
        const ccLeads = await prisma.lead.count({
            where: { batchId: batch.id, isCallCenter: true, campaignType: 'FREE_SEMINAR' }
        });
        console.log("CC Leads in this batch:", ccLeads);

        // Also check if any leads are assigned to someone with a CC role?
        const leads = await prisma.lead.findMany({
            where: { batchId: batch.id, campaignType: 'FREE_SEMINAR' },
            include: { assignedUser: true }
        });

        let countCCRole = 0;
        leads.forEach(l => {
            const r = String(l.assignedUser?.role || '').toUpperCase().replace(/ /g, '_');
            if (['CALLER', 'CALL_CENTER_AGENT', 'CALL_CENTER'].includes(r)) {
                countCCRole++;
            }
        });
        console.log("Leads assigned to CC Role:", countCCRole);

    } else {
        console.log("Batch not found");
    }
}
run().catch(console.error).finally(() => prisma.$disconnect());
