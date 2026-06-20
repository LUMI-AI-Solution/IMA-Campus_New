const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function cleanUpAutoHealBugs() {
    console.log("Deleting auto-heal spawned duplicates...");
    const delRes = await p.lead.deleteMany({
        where: { phone: { startsWith: '07' } }
    });
    console.log(`Deleted ${delRes.count} auto-heal duplicate leads.`);
}

cleanUpAutoHealBugs().then(() => p.$disconnect());
