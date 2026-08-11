const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        select: { id: true, firstName: true }
    });
    const userMap = {};
    users.forEach(u => userMap[u.id] = u.firstName);

    const counts = await prisma.lead.groupBy({
        by: ['assignedTo', 'campaignType', 'inquiryType'],
        where: { batchId: 26 },
        _count: { id: true }
    });

    console.log("=== BATCH 26 LEADS BREAKDOWN BY STAFF ===");
    const results = {};
    for (const row of counts) {
        if (!row.assignedTo) continue;
        const name = userMap[row.assignedTo] || `User ${row.assignedTo}`;
        if (!results[name]) results[name] = {};
        const key = `${row.campaignType} | ${row.inquiryType}`;
        results[name][key] = row._count.id;
    }

    // Filter to show only the users the client mentioned, plus any large numbers
    for (const [name, data] of Object.entries(results)) {
        let total = 0;
        for (const v of Object.values(data)) total += v;
        if (total > 0) {
            console.log(`\nStaff: ${name} (ID: ${Object.keys(userMap).find(key => userMap[key] === name)})`);
            for (const [key, count] of Object.entries(data)) {
                console.log(`  - ${key}: ${count}`);
            }
        }
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
