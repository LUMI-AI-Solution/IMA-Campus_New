const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
async function run() {
    const saContent = fs.readFileSync('/root/IMA-Campus/backend/serviceAccountKey.json', 'utf8');
    await prisma.appSetting.upsert({
        where: { key: 'GSHEET_SERVICE_ACCOUNT' },
        update: { value: saContent },
        create: { key: 'GSHEET_SERVICE_ACCOUNT', value: saContent }
    });
    console.log("Inserted GSHEET_SERVICE_ACCOUNT successfully.");
}
run();
