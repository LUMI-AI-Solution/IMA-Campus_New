const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    let whereClause = {};
    whereClause.campaignType = 'AFTER_SEMINAR';
    const businessId = '17';
    
    const bizBatches = await prisma.batch.findMany({ where: { businessId: parseInt(businessId) }, select: { id: true } });

    whereClause.AND = [
        ...(whereClause.AND || []),
        {
            OR: [
                { batchId: { in: bizBatches.map(b => b.id) } },
                { phone: { endsWith: `_BIZ_${businessId}` } },
                { phone: { contains: `_BIZ_${businessId}_` } }
            ]
        }
    ];
    
    // Tab filtering ALL has no extra whereClause additions

    const leads = await prisma.lead.findMany({ where: whereClause });
    console.log("Total leads for tab ALL:", leads.length);

    // Tab NEW
    let whereClauseNew = { ...whereClause };
    whereClauseNew.status = { in: ['NEW', 'OPEN'] };
    whereClauseNew.assignedTo = null;
    whereClauseNew.OR = [
        { callCenterRequestStatus: null },
        { callCenterRequestStatus: 'REJECTED' }
    ];
    
    const leadsNew = await prisma.lead.findMany({ where: whereClauseNew });
    console.log("Total leads for tab NEW:", leadsNew.length);
}
main().finally(() => prisma.$disconnect());
