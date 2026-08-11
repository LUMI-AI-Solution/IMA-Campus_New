const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const leads = await prisma.lead.findMany({
        where: { id: { in: [51587, 55585, 55819] } }
    });
    console.log(leads.map(l => ({ id: l.id, phone: l.phone, status: l.status, campaignType: l.campaignType, batchId: l.batchId, assignedTo: l.assignedTo })));
}
main().finally(() => prisma.$disconnect());
