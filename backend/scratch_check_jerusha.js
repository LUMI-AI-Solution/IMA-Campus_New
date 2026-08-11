const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
    const leads = await prisma.lead.findMany({
        where: { 
            campaignType: 'AFTER_SEMINAR',
            OR: [
                { phone: { endsWith: `_BIZ_1` } },
                { phone: { contains: `_BIZ_1_` } }
            ]
        },
        include: { assignedUser: { select: { firstName: true, lastName: true } } }
    });
    
    leads.forEach(l => {
        if (l.assignedUser && l.assignedUser.firstName.includes('Jerusha')) {
            console.log('Jerusha Lead:', l.phone, 'BatchID:', l.batchId);
        }
    });
}
run().catch(console.error).finally(() => prisma.$disconnect());
