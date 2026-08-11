const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const configSetting = await prisma.appSetting.findUnique({ where: { key: 'AI_SLIP_VERIFICATION_SCHEDULE' } });
    console.log(configSetting);
}
main();
