const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const bId = 40;
    const bizId = 1;

    const batchOrConditions = [
        { batchId: bId },
        { phone: { endsWith: `_BATCH_${bId}` } },
        { phone: { contains: `_BATCH_${bId}_` } }
    ];

    let whereClause = {
        campaignType: 'AFTER_SEMINAR', 
        inquiryType: { in: ['OPEN_SEMINAR', 'NORMAL'] },
        source: { not: 'bridge_transfer' }
    };

    whereClause.AND = [
        { OR: batchOrConditions },
        {
            OR: [
                { phone: { endsWith: `_BIZ_${bizId}` } },
                { phone: { endsWith: `_BIZ_${bizId}_AS` } },
                { phone: { contains: `_BIZ_${bizId}_` } }
            ]
        }
    ];

    const leads = await prisma.lead.count({ where: whereClause });
    console.log("New logic leads count:", leads);

    const oldBatchOrConditions = [
        { batchId: bId },
        { phone: { contains: `_BATCH_${bId}` } }
    ];

    let oldWhereClause = {
        campaignType: 'AFTER_SEMINAR', 
        inquiryType: { in: ['OPEN_SEMINAR', 'NORMAL'] },
        source: { not: 'bridge_transfer' }
    };

    oldWhereClause.AND = [
        { OR: oldBatchOrConditions },
        {
            OR: [
                { phone: { endsWith: `_BIZ_${bizId}` } },
                { phone: { endsWith: `_BIZ_${bizId}_AS` } },
                { phone: { contains: `_BIZ_${bizId}_` } }
            ]
        }
    ];

    const oldLeads = await prisma.lead.count({ where: oldWhereClause });
    console.log("Old logic leads count:", oldLeads);
}
main().catch(console.error).finally(() => prisma.$disconnect());
