const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.findMany({
        where: { 
            campaignType: 'FREE_SEMINAR',
            callCenterRequestStatus: 'APPROVED',
            assignedTo: { not: null }
        },
        include: {
            assignedUser: { select: { role: true, firstName: true } }
        }
    });

    const isCallCenterRole = (role) => {
        const r = String(role || '').toUpperCase().replace(/ /g, '_');
        return ['CALLER', 'CALL_CENTER_AGENT', 'CALL_CENTER'].includes(r);
    };

    let stuckIds = [];

    leads.forEach(l => {
        const isAgentCC = l.assignedUser && isCallCenterRole(l.assignedUser.role);
        if (!isAgentCC) {
            stuckIds.push(l.id);
        }
    });

    if (stuckIds.length > 0) {
        console.log(`Found ${stuckIds.length} stuck leads. Fixing them...`);
        const result = await prisma.lead.updateMany({
            where: { id: { in: stuckIds } },
            data: { assignedTo: null }
        });
        console.log(`Fixed ${result.count} leads.`);
    } else {
        console.log("No stuck leads found.");
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
