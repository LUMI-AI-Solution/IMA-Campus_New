const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Exactly what getDashboardStats does
    const isManager = true; 
    let whereClause = { campaignType: 'AFTER_SEMINAR', source: { not: 'system' }, AND: [] };
    
    // Simulate Batch 26
    whereClause.AND.push({ batchId: 26 });
    // Simulate Business 1
    whereClause.AND.push({
        OR: [
            { batchId: null },
            { batch: { businessId: 1 } }
        ]
    });

    const counts = await Promise.all([
        prisma.lead.count({ where: { ...whereClause, inquiryType: 'OPEN_SEMINAR' } }),
        prisma.lead.count({ where: { ...whereClause, inquiryType: 'NORMAL' } }),
        prisma.lead.count({ where: { ...whereClause, inquiryType: 'NEW_INQ' } }),
    ]);

    console.log("Stats for Batch 26, Business 1 (Manager view, AFTER_SEMINAR only):");
    console.log("OPEN_SEMINAR:", counts[0]);
    console.log("NORMAL:", counts[1]);
    console.log("NEW_INQ:", counts[2]);
}
main().catch(console.error).finally(() => prisma.$disconnect());
