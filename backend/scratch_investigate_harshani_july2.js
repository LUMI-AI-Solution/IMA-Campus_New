const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.findMany({
        where: { assignedTo: 49 },
        select: { id: true, batchId: true, campaignType: true, inquiryType: true, assignedAt: true },
        orderBy: { assignedAt: 'asc' }
    });

    console.log("=== ALL LEADS ASSIGNED TO HARSHANI ===");
    let countJuly2 = 0;
    for (const lead of leads) {
        if (lead.assignedAt) {
            const dateStr = lead.assignedAt.toISOString();
            if (dateStr.startsWith('2026-07-02')) {
                countJuly2++;
                // console.log(lead); // To see the specifics
            }
        }
    }
    console.log(`Total leads assigned to Harshani on 2026-07-02: ${countJuly2}`);

    // Group all her leads by date
    const byDate = {};
    for (const lead of leads) {
        if (lead.assignedAt) {
            const date = lead.assignedAt.toISOString().split('T')[0];
            if (!byDate[date]) byDate[date] = {};
            const key = `${lead.campaignType} | ${lead.inquiryType} (Batch: ${lead.batchId})`;
            byDate[date][key] = (byDate[date][key] || 0) + 1;
        }
    }
    console.log("\nHarshani's assignment history by date:");
    for (const [date, data] of Object.entries(byDate)) {
        console.log(date);
        for (const [key, count] of Object.entries(data)) {
            console.log(`  - ${key}: ${count}`);
        }
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
