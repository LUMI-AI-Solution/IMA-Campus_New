const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    let start = new Date(new Date().setHours(0,0,0,0));
    let end = new Date(new Date().setHours(23,59,59,999));
    
    // Fallback if Date is still invalid
    if (isNaN(start.getTime())) start = new Date(new Date().setHours(0,0,0,0));
    if (isNaN(end.getTime())) end = new Date(new Date().setHours(23,59,59,999));

    let leadWhere = { campaignType: 'FREE_SEMINAR', createdAt: { gte: start, lte: end } };
    
    // We will bypass bizFilter for this test and get all.
    const leads = await prisma.lead.findMany({ 
        where: { campaignType: 'FREE_SEMINAR' }, // Removed date filter to see all leads for test
        include: { 
            assignedUser: { select: { firstName: true, businessType: true, role: true } }
        }
    });

    const getEffectiveStatus = (l) => {
        const isCCAgent = ['CALLER', 'CALL_CENTER_AGENT', 'CALL_CENTER'].includes((l.assignedUser?.role || '').toUpperCase().replace(/ /g, '_'));
        
        if (!isCCAgent && (l.callCenterRequestStatus === 'REQUESTED' || l.callCenterRequestStatus === 'APPROVED')) {
            return 'call_center';
        }
        
        let status = l.callStatus?.toLowerCase() || 'pending';
        if (l.isCallCenter && l.roundProgress && l.roundProgress.length > 0) {
             const r2 = l.roundProgress.find(r => r.roundNum === 2);
             if (r2 && r2.callStatus) {
                 status = r2.callStatus.toLowerCase();
             }
        }
        
        if (!l.isCallCenter && l.phase > 1 && status === 'pending') {
            status = 'no_answer';
        }
        
        return status;
    };

    const agentMap = {};
    let ccSkipped = 0;
    
    leads.forEach(l => {
        if (!l.assignedTo) return;
        const status = getEffectiveStatus(l);
        
        if (status === 'call_center') {
            ccSkipped++;
            return;
        }

        const name = l.assignedUser?.firstName || "Staff";
        if (!agentMap[name]) agentMap[name] = { agentName: name, role: l.assignedUser?.role || "Coordinator", assigned: 0, answered: 0, noAnswer: 0, reject: 0, pending: 0 };
        
        agentMap[name].assigned++;
        
        if (status === 'answered' || status === 'completed') agentMap[name].answered++;
        else if (status === 'no_answer') agentMap[name].noAnswer++;
        else if (status === 'reject') agentMap[name].reject++;
        else agentMap[name].pending++;
    });

    console.log("Skipped due to call_center status:", ccSkipped);
    console.log("Agent Map:");
    console.log(Object.values(agentMap).filter(a => ['Call Center Agent', 'Caller'].includes(a.role)));
}
run().catch(console.error).finally(() => prisma.$disconnect());
