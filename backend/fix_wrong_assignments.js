const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixWrongAssignments() {
    console.log("Analyzing Lead Assignments for Mismatches...\n");

    const businesses = await prisma.business.findMany();
    const businessMap = {};
    businesses.forEach(b => businessMap[b.id] = b.name);

    const leads = await prisma.lead.findMany({
        where: { assignedTo: { not: null } },
        include: { assignedUser: true }
    });

    const mismatchedLeadIds = [];

    for (const lead of leads) {
        if (!lead.phone || !lead.phone.includes('_BIZ_')) continue;

        const match = lead.phone.match(/_BIZ_(\d+)_/);
        if (!match) continue;

        const leadBusinessId = parseInt(match[1]);
        const leadBusinessName = businessMap[leadBusinessId];
        
        const staff = lead.assignedUser;
        if (!staff || !staff.businessType) continue;

        if (!staff.businessType.includes(leadBusinessName)) {
            mismatchedLeadIds.push(lead.id);
        }
    }

    console.log(`Found ${mismatchedLeadIds.length} mismatched leads.`);

    if (mismatchedLeadIds.length > 0) {
        console.log("Unassigning these leads and returning them to the NEW pool...");
        const result = await prisma.lead.updateMany({
            where: { id: { in: mismatchedLeadIds } },
            data: { 
                assignedTo: null, 
                status: 'NEW', 
                phase: 1, 
                callStatus: 'pending'
            }
        });
        console.log(`Successfully fixed ${result.count} leads! They are now ready to be properly assigned.`);
    } else {
        console.log("No mismatched leads found.");
    }
}

fixWrongAssignments()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
