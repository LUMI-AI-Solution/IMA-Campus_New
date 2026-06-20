const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const c = await prisma.cRMCampaign.findFirst({ where: { type: 'AFTER_SEMINAR' }});
    console.log(c.config);
}
main();
