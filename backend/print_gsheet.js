const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
    const setting = await prisma.appSetting.findUnique({ where: { key: 'GSHEET_CONFIGS' } });
    console.log(JSON.stringify(JSON.parse(setting.value), null, 2));
}
run();
