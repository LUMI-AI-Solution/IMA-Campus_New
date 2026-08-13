const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getScopedBusinessId } = require('./utils/scopeUtils');

async function run() {
    const user = await prisma.user.findFirst({ where: { firstName: { contains: 'Shamalka' } } });
    if (!user) return console.log("User not found");
    
    // Simulate user selecting "IMA පහට 5ක්"
    const biz = await prisma.business.findFirst({ where: { name: { contains: 'පහට 5ක්' } } });
    const requestedBizId = biz ? biz.id : null;
    console.log("Requested Biz ID:", requestedBizId);

    const scopedBizId = await getScopedBusinessId(user, requestedBizId);
    console.log("Returned Scoped Biz ID:", scopedBizId);
    
    if (scopedBizId !== null) {
        let whereClause = { campaignType: 'FREE_SEMINAR' };
        whereClause.assignedTo = user.id;
        whereClause.OR = [ { callCenterRequestStatus: null }, { callCenterRequestStatus: 'REJECTED' } ];
        
        const bizBatches = await prisma.batch.findMany({ where: { businessId: Number(scopedBizId) }, select: { id: true } });
        whereClause.AND = [
            {
                OR: [
                    { batchId: { in: bizBatches.map(b => b.id) } },
                    { phone: { endsWith: `_BIZ_${scopedBizId}` } },
                    { phone: { contains: `_BIZ_${scopedBizId}_` } }
                ]
            }
        ];
        
        const leads = await prisma.lead.findMany({ where: whereClause });
        console.log("Found leads length:", leads.length);
    }
}
run().catch(console.error).finally(() => prisma.$disconnect());
