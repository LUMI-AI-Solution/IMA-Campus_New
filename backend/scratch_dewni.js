const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
    const user = await prisma.user.findFirst({ where: { firstName: { contains: 'Dewni' } } });
    console.log(user ? `Dewni ID: ${user.id}, businessType: ${user.businessType}` : "Dewni Not found");
    const lead = await prisma.lead.findFirst({ where: { phone: '94714941559' }, include: { batch: { include: { business: true } } } });
    console.log(lead ? `Lead Batch Business: ${lead.batch?.business?.id}` : "Lead Not found");
}
run();
