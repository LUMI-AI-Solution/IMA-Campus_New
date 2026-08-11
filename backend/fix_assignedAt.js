const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Find all leads that are in Round 2 OPEN_SEMINAR but their assignedAt is way newer than createdAt (likely due to the script)
    const leads = await prisma.lead.findMany({
        where: {
            campaignType: 'AFTER_SEMINAR',
            inquiryType: 'OPEN_SEMINAR',
            assignedAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // assigned today
            createdAt: { lt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) } // created more than 2 days ago
        }
    });

    console.log(`Found ${leads.length} leads to fix.`);

    for (const l of leads) {
        await prisma.lead.update({
            where: { id: l.id },
            data: { assignedAt: l.createdAt }
        });
        console.log(`Fixed lead ${l.id} - ${l.phone}`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
