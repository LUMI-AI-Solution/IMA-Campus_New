const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const worked = await prisma.lead.groupBy({
        by: ['assignedTo', 'callStatus'],
        where: { batchId: 26, campaignType: 'AFTER_SEMINAR', inquiryType: 'OPEN_SEMINAR' },
        _count: { id: true }
    });
    console.log("=== ALL OPEN_SEM WORKED STATUS ===");
    const byStaff = {};
    for (const w of worked) {
        if (w.callStatus !== 'pending') {
            byStaff[w.assignedTo] = (byStaff[w.assignedTo] || 0) + w._count.id;
        }
    }
    console.log(byStaff);
}
main().catch(console.error).finally(() => prisma.$disconnect());
