const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.findMany({
        where: { 
            campaignType: 'FREE_SEMINAR',
            updatedAt: { gte: new Date(new Date().getTime() - 2 * 60 * 60 * 1000) } // last 2 hours
        },
        orderBy: { updatedAt: 'desc' },
        take: 20
    });
    console.log(leads.map(l => ({ id: l.id, phase: l.phase, callStatus: l.callStatus, assignedTo: l.assignedTo, updatedAt: l.updatedAt })));
}
main();
