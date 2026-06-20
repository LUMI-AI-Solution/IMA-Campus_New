const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
    const s1 = await prisma.appSetting.findUnique({ where: { key: 'GSHEET_WEB_APP_URL' } });
    console.log("GSHEET_WEB_APP_URL:", s1);
    const s2 = await prisma.appSetting.findUnique({ where: { key: 'GSHEET_SERVICE_ACCOUNT' } });
    console.log("GSHEET_SERVICE_ACCOUNT exists:", !!s2);
}
run();
