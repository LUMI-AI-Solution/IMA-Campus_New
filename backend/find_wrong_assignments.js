const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findWrongAssignments() {
    console.log("Analyzing Lead Assignments for Mismatches...\n");

    const businesses = await prisma.business.findMany();
    const businessMap = {};
    businesses.forEach(b => businessMap[b.id] = b.name);

    const leads = await prisma.lead.findMany({
        where: { assignedTo: { not: null } },
        include: { assignedUser: true }
    });

    let wrongCount = 0;
    const proofExamples = [];

    for (const lead of leads) {
        if (!lead.phone || !lead.phone.includes('_BIZ_')) continue;

        // Extract business ID from phone (e.g., 0712345678_BIZ_1_ROUND_1)
        const match = lead.phone.match(/_BIZ_(\d+)_/);
        if (!match) continue;

        const leadBusinessId = parseInt(match[1]);
        const leadBusinessName = businessMap[leadBusinessId];
        
        const staff = lead.assignedUser;
        if (!staff || !staff.businessType) continue;

        // Check if the staff's businessType includes the lead's business name
        // Usually staff.businessType has comma separated names like "මාස 06න් A/L - Art"
        if (!staff.businessType.includes(leadBusinessName)) {
            wrongCount++;
            
            // Collect up to 10 examples to show the user
            if (proofExamples.length < 10) {
                const cleanPhone = lead.phone.split('_')[0];
                proofExamples.push({
                    Lead_Phone: cleanPhone,
                    Lead_Actual_Business: leadBusinessName,
                    Assigned_Staff: `${staff.firstName} ${staff.lastName}`,
                    Staff_Actual_Business: staff.businessType
                });
            }
        }
    }

    console.log(`❌ Found ${wrongCount} leads that are assigned to the WRONG staff members!\n`);
    console.log("Here is the SOLID PROOF (First 10 Examples):\n");
    console.table(proofExamples);
    
    console.log("\nSolutions to fix this:");
    console.log("1. Manager should go to the relevant CRM tab (e.g. ART).");
    console.log("2. Look at the leads that have wrong badges (like TECH or COM).");
    console.log("3. Select those leads using the checkboxes.");
    console.log("4. Use the 'Bulk Assign' button at the top to re-assign them to a correct staff member.");
}

findWrongAssignments()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
