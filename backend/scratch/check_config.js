const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const configSetting = await prisma.appSetting.findUnique({ where: { key: 'AI_SLIP_VERIFICATION_CONFIG' } });
    if(configSetting) {
        console.log(JSON.stringify(JSON.parse(configSetting.value), null, 2));
    } else {
        console.log("No config found");
    }
    await prisma.$disconnect();
}
main();
