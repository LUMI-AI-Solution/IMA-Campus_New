const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const url = "https://script.google.com/macros/s/AKfycbzzNyz_g6cn0Bss5jucHUU_kq3UVwXA8hp6hcLSPZNePYgVkXO8zP-nVy0eZVDApLZd9g/exec";
    
    // Update the Global Web App URL setting
    await prisma.appSetting.upsert({
        where: { key: 'GSHEET_WEB_APP_URL' },
        update: { value: url },
        create: { key: 'GSHEET_WEB_APP_URL', value: url }
    });
    
    // Delete the faulty Service Account
    try {
        await prisma.appSetting.delete({
            where: { key: 'GSHEET_SERVICE_ACCOUNT' }
        });
        console.log("Deleted GSHEET_SERVICE_ACCOUNT");
    } catch (e) {
        console.log("GSHEET_SERVICE_ACCOUNT already deleted or not found");
    }
    
    console.log("Successfully updated GSHEET_WEB_APP_URL");
}
run();
