const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    let whereClause = { campaignType: { in: ['AFTER_SEMINAR', 'FREE_SEMINAR'] }, source: { not: 'system' } };
    
    // simulated params
    // staffId: 49 (Harshani)
    whereClause.assignedTo = 49;
    
    // inquiryType: 'OPEN_SEMINAR,NORMAL' (from the frontend dropdown)
    whereClause.inquiryType = { in: ['OPEN_SEMINAR', 'NORMAL'] };
    
    // businessId: 1 (මාස 06න් A/L - Art)
    whereClause.businessId = 1;

    // batchId: 26 (2027 July Intake - කලා අංශය)
    whereClause.batchId = 26;

    const leads = await prisma.lead.count({
        where: whereClause
    });
    
    console.log("Total matched leads with new fixes:", leads);
}

main().catch(console.error).finally(() => prisma.$disconnect());
