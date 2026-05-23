const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixOldLeads() {
    console.log("⏳ Starting to fix old leads...");
    
    // Assigned wela thiyena eth assignedAt nathi leads okkoma gannawa
    const oldLeads = await prisma.lead.findMany({
        where: {
            assignedTo: { not: null },
            assignedAt: null
        }
    });

    console.log(`🔍 Found ${oldLeads.length} old leads to fix.`);

    let count = 0;
    for (const lead of oldLeads) {
        await prisma.lead.update({
            where: { id: lead.id },
            data: { assignedAt: lead.updatedAt || lead.createdAt } // Parana date eka auto fill karanawa
        });
        count++;
    }

    console.log(`✅ All ${count} old leads fixed successfully!`);
}

fixOldLeads()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());