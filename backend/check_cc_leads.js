const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.findMany({
        where: { 
            campaignType: 'FREE_SEMINAR',
            callCenterRequestStatus: { in: ['REQUESTED', 'APPROVED'] }
        },
        include: {
            assignedUser: { select: { role: true, firstName: true } }
        }
    });

    console.log(`Found ${leads.length} leads with REQUESTED or APPROVED status.`);
    
    let requestedCount = 0;
    let approvedNullCount = 0;
    let approvedNotNullCount = 0;
    
    let isCCAgentCount = 0;

    const isCallCenterRole = (role) => {
        const r = String(role || '').toUpperCase().replace(/ /g, '_');
        return ['CALLER', 'CALL_CENTER_AGENT', 'CALL_CENTER'].includes(r);
    };

    leads.forEach(l => {
        const isAgentCC = l.assignedUser && isCallCenterRole(l.assignedUser.role);
        if (isAgentCC) {
            isCCAgentCount++;
        } else {
            if (l.callCenterRequestStatus === 'REQUESTED') {
                requestedCount++;
            } else if (l.callCenterRequestStatus === 'APPROVED') {
                if (l.assignedTo === null) {
                    approvedNullCount++;
                } else {
                    approvedNotNullCount++;
                }
            }
        }
    });

    console.log(`Requested (Pending Approvals tab): ${requestedCount}`);
    console.log(`Approved & assignedTo === null (Unassigned Pool tab): ${approvedNullCount}`);
    console.log(`Approved & assignedTo !== null (Missing from Unassigned Pool!): ${approvedNotNullCount}`);
    console.log(`Assigned to CC Agent already (Not counted as pending CC): ${isCCAgentCount}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
