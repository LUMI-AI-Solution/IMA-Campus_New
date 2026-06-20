const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixMismatchAssignments() {
    console.log("Checking for cross-business misassigned leads...");
    const leads = await prisma.lead.findMany({
        where: { campaignType: 'AFTER_SEMINAR', assignedTo: { not: null } },
        include: { assignedUser: true }
    });

    let fixedCount = 0;
    for (const lead of leads) {
        if (!lead.assignedUser || !lead.assignedUser.businessType) continue;
        
        const match = lead.phone ? lead.phone.match(/_BIZ_(\d+)/) : null;
        if (!match) continue;
        const leadBizId = match[1];

        const business = await prisma.business.findFirst({
            where: { name: lead.assignedUser.businessType }
        });

        if (business && business.id.toString() !== leadBizId) {
            console.log(`Unassigning Lead ${lead.phone} (Biz ${leadBizId}) from User ${lead.assignedUser.firstName} (Biz ${business.id})`);
            await prisma.lead.update({
                where: { id: lead.id },
                data: { assignedTo: null, status: 'NEW', callStatus: 'pending', phase: 1 }
            });
            fixedCount++;
        }
    }
    console.log(`Fixed ${fixedCount} misassigned leads!`);
}

fixMismatchAssignments().finally(() => prisma.$disconnect());
