const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.findMany({
        where: {
            batchId: 40,
            inquiryType: 'NEW_INQ'
        },
        select: {
            id: true,
            createdAt: true,
            source: true,
            batchId: true
        },
        orderBy: { createdAt: 'asc' }
    });
    
    let sourceCount = {};
    let monthCount = {};
    
    leads.forEach(l => {
        sourceCount[l.source] = (sourceCount[l.source] || 0) + 1;
        const month = l.createdAt.toISOString().slice(0, 7);
        monthCount[month] = (monthCount[month] || 0) + 1;
    });

    console.log("Sources:", sourceCount);
    console.log("Months created:", monthCount);
}
main().catch(console.error).finally(() => prisma.$disconnect());
