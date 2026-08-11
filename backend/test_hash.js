const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const leads = await prisma.lead.findMany({
        where: {
            campaignType: 'AFTER_SEMINAR',
            OR: [
                { name: { contains: '#' } },
                { feedback: { contains: '#' } }
            ]
        },
        select: { id: true, name: true, feedback: true }
    });
    console.log(`Found ${leads.length} leads with '#'`);
    if(leads.length > 0) console.log(leads[0]);
}
main().catch(console.error).finally(() => prisma.$disconnect());
