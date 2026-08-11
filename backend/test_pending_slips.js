const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const pendingSlips = await prisma.payment.findMany({
        where: { status: { in: [0, 4] }, slip_image: { not: null } },
        select: { id: true, businessId: true, batchId: true }
    });
    console.log(`Total Pending Slips: ${pendingSlips.length}`);
    console.log(pendingSlips.slice(0, 5));
    
    const configSetting = await prisma.appSetting.findUnique({ where: { key: 'AI_SLIP_VERIFICATION_SCHEDULE' } });
    console.log("Schedule Config:", configSetting.value);
}
main();
