const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const leads = await prisma.lead.findMany({ 
        where: { campaignType: 'FREE_SEMINAR', isCallCenter: true },
        include: { 
            assignedUser: { select: { firstName: true, businessType: true, role: true } }
        }
    });

    console.log("Total CC leads:", leads.length);
    leads.slice(0, 5).forEach(l => {
        console.log({
            id: l.id,
            isCallCenter: l.isCallCenter,
            callCenterRequestStatus: l.callCenterRequestStatus,
            assignedTo: l.assignedTo,
            assignedUser: l.assignedUser,
            callStatus: l.callStatus,
        });
    });
}

run().catch(console.error).finally(() => prisma.$disconnect());
