const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    const configSetting = await prisma.appSetting.findUnique({ where: { key: 'GSHEET_CONFIGS' } });
    console.log(configSetting.value);
}
test().finally(() => prisma.$disconnect());
