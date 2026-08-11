const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const leads = await prisma.lead.findMany({
        where: { businessId: 17, campaignType: 'AFTER_SEMINAR' },
        orderBy: { createdAt: 'desc' },
        take: 5
    });
    console.log(leads);
}
main();
