const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getWrongAssignmentBreakdown() {
    const businesses = await prisma.business.findMany();
    const businessMap = {};
    businesses.forEach(b => businessMap[b.id] = b.name);

    const leads = await prisma.lead.findMany({
        where: { assignedTo: { not: null } },
        include: { assignedUser: true }
    });

    const breakdown = {};
    let totalWrong = 0;

    for (const lead of leads) {
        if (!lead.phone || !lead.phone.includes('_BIZ_')) continue;

        const match = lead.phone.match(/_BIZ_(\d+)_/);
        if (!match) continue;

        const leadBusinessId = parseInt(match[1]);
        const leadBusinessName = businessMap[leadBusinessId];
        
        const staff = lead.assignedUser;
        if (!staff || !staff.businessType) continue;

        if (!staff.businessType.includes(leadBusinessName)) {
            totalWrong++;
            
            // Increment the count for this specific business
            if (!breakdown[leadBusinessName]) {
                breakdown[leadBusinessName] = 0;
            }
            breakdown[leadBusinessName]++;
        }
    }

    console.log(`✅ Total Wrong Assignments: ${totalWrong}\n`);
    console.log(`📊 Breakdown by Actual Business of the Leads:`);
    
    // Convert to array for table printing
    const tableData = Object.keys(breakdown).map(biz => ({
        "Lead Business Type": biz,
        "Total Wrongly Assigned Leads": breakdown[biz]
    }));
    
    // Sort descending by count
    tableData.sort((a, b) => b["Total Wrongly Assigned Leads"] - a["Total Wrongly Assigned Leads"]);
    
    console.table(tableData);
}

getWrongAssignmentBreakdown()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
