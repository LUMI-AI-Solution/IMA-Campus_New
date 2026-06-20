const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        console.log("=== BATCH FILTER MISMATCH ===");
        // We look for BIZ_5 (which seems to be 06month al art based on the screenshot, or we can just look for businessId=5 if we know it)
        const allLeads = await prisma.lead.findMany({
            where: { campaignType: 'AFTER_SEMINAR', phone: { contains: '_BIZ_' } }
        });
        
        let batchNull = 0;
        let batchAssigned = 0;
        
        allLeads.forEach(l => {
            if (l.batchId === null) {
                batchNull++;
            } else {
                batchAssigned++;
            }
        });
        
        console.log(`Total AFTER_SEMINAR Leads: ${allLeads.length}`);
        console.log(`With Batch ID: ${batchAssigned}`);
        console.log(`Without Batch ID (NULL): ${batchNull}`);

        console.log("\n=== STAFF MISATTRIBUTION ===");
        const staff = await prisma.user.findMany({
            where: { role: { in: ['STAFF', 'MANAGER', 'ASS_MANAGER', 'SUPER', 'SYSTEM_ADMIN'] } }
        });
        
        const staffLeads = await prisma.lead.groupBy({
            by: ['assignedTo'],
            where: { campaignType: 'AFTER_SEMINAR', inquiryType: 'PAID_CAMP', assignedTo: { not: null } },
            _count: { id: true }
        });
        
        console.log("PAID_CAMP Leads assigned to staff:");
        for (const st of staffLeads) {
            const user = staff.find(u => u.id === st.assignedTo);
            if (user) {
                console.log(`Staff: ${user.firstName} ${user.lastName} (Role: ${user.role}, Dept: ${user.department}) - Leads: ${st._count.id}`);
            }
        }
        
        console.log("\n=== LEAD DUPLICATION ===");
        const leadsByPhone = {};
        allLeads.forEach(l => {
            const cleanPhone = l.phone.split('_')[0].replace(/[^0-9]/g, '');
            if (!leadsByPhone[cleanPhone]) leadsByPhone[cleanPhone] = [];
            leadsByPhone[cleanPhone].push(l);
        });
        
        let duplicatesCount = 0;
        let exactlyTwoCount = 0;
        let moreThanTwoCount = 0;
        
        for (const phone in leadsByPhone) {
            if (leadsByPhone[phone].length > 1) {
                duplicatesCount++;
                if (leadsByPhone[phone].length === 2) exactlyTwoCount++;
                if (leadsByPhone[phone].length > 2) moreThanTwoCount++;
            }
        }
        
        console.log(`Total unique phone numbers: ${Object.keys(leadsByPhone).length}`);
        console.log(`Number of students with multiple leads: ${duplicatesCount}`);
        console.log(`  - With exactly 2 leads: ${exactlyTwoCount}`);
        console.log(`  - With > 2 leads: ${moreThanTwoCount}`);
        
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

run();
