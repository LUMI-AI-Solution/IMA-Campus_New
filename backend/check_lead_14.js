const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLead() {
    try {
        const lead = await prisma.lead.findFirst({
            where: { phone: '94783699412' }
        });
        console.log(lead);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
checkLead();
