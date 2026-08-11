const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const fiveMinsAgo = new Date(Date.now() - 15 * 60000);
    const recentUpdated = await prisma.payment.findMany({
        where: {
            updatedAt: { gte: fiveMinsAgo },
            payment_type: 1,
            group: { type: 1 }
        },
        include: { business: true }
    });

    console.log(`Found ${recentUpdated.length} payments updated recently.`);
    
    const byBusiness = {};
    for (const p of recentUpdated) {
        if (!byBusiness[p.business.name]) byBusiness[p.business.name] = [];
        byBusiness[p.business.name].push(p);
    }
    
    for (const biz in byBusiness) {
        console.log(`- ${biz}: ${byBusiness[biz].length} payments`);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
