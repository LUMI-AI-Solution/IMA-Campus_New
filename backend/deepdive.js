const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deepDive() {
    try {
        const rejected = await prisma.payment.findMany({
            where: { status: 2, actionedById: null },
            orderBy: { id: 'desc' }
        });

        console.log(`Found ${rejected.length} auto-rejected payments.`);
        
        // Count by date created
        const byDate = {};
        rejected.forEach(p => {
            const dateStr = p.created_at.toISOString().split('T')[0];
            byDate[dateStr] = (byDate[dateStr] || 0) + 1;
        });
        
        console.table(byDate);

        // Get the first 5 to see details
        console.log(JSON.stringify(rejected.slice(0, 5), null, 2));

    } finally {
        await prisma.$disconnect();
    }
}

deepDive();
