const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
    const lead = await prisma.lead.findFirst({ where: { phone: { contains: '94742746667' } } });
    if(lead) {
        console.log("Lead:", lead.id, lead.phone, lead.enrollmentStatus);
    } else {
        console.log("Lead not found");
    }
}
run().catch(console.log).finally(() => prisma.$disconnect());
