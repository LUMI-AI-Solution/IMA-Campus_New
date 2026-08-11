const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
    const leads = await prisma.lead.findMany({
        where: { batchId: 1, campaignType: 'AFTER_SEMINAR' },
        include: { assignedUser: { select: { firstName: true, lastName: true } } }
    });
    
    leads.forEach(l => {
        if (l.assignedUser && (l.assignedUser.firstName.includes('Chamindu') || l.assignedUser.firstName.includes('Subodhani'))) {
            console.log('Found in DB:', l.assignedUser.firstName, l.phone, l.inquiryType, l.campaignType, l.batchId);
        }
    });
}
run().catch(console.error).finally(() => prisma.$disconnect());
