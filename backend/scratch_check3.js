const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const sa = await prisma.appSetting.findUnique({ where: { key: 'GSHEET_SERVICE_ACCOUNT' } });
    if(sa) {
        try {
            const json = JSON.parse(sa.value);
            console.log("SERVICE_ACCOUNT_EMAIL:", json.client_email);
        } catch(e) {
            console.log("Invalid JSON");
        }
    } else {
        console.log('No service account found');
    }
}
main().finally(() => { prisma.$disconnect(); process.exit(0); });
