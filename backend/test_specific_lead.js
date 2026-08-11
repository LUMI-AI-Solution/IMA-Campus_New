const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
    const leads = await prisma.lead.findMany({
        where: { phone: { contains: '94705034939' } },
        select: { id: true, phone: true, campaignType: true, inquiryType: true, assignedTo: true, batchId: true, assignedUser: { select: { firstName: true, lastName: true } } }
    });
    console.log(JSON.stringify(leads, null, 2));
    process.exit(0);
}
run().catch(console.error);
