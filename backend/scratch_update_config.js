const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const configSetting = await prisma.appSetting.findUnique({ where: { key: 'GSHEET_CONFIGS' } });
    let configs = JSON.parse(configSetting.value);
    
    // Add webAppUrl to May 2026
    if (configs['May 2026']) {
        configs['May 2026'].webAppUrl = 'https://script.google.com/macros/s/AKfycbwKgZoSnC0FhT2a02mRXdPEXqb0y2Y_v7Z4PYsILkdImH02q79YMHeYGYOLqxbc631_EQ/exec';
    }
    
    // Also add to May-2026 just in case!
    if (configs['May-2026']) {
        configs['May-2026'].webAppUrl = 'https://script.google.com/macros/s/AKfycbwKgZoSnC0FhT2a02mRXdPEXqb0y2Y_v7Z4PYsILkdImH02q79YMHeYGYOLqxbc631_EQ/exec';
    }

    await prisma.appSetting.update({
        where: { key: 'GSHEET_CONFIGS' },
        data: { value: JSON.stringify(configs) }
    });
    console.log("Config updated successfully.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
