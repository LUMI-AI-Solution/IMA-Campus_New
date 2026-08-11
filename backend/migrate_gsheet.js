const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
    const setting = await prisma.appSetting.findUnique({ where: { key: 'GSHEET_CONFIGS' } });
    if (!setting || !setting.value) return console.log("No config found");
    const configs = JSON.parse(setting.value);
    
    // new structure: { bizId: { batchId: [url1, url2] } }
    const newConfigs = {};
    for (const bizId in configs) {
        newConfigs[bizId] = {};
        for (const batchId in configs[bizId]) {
            newConfigs[bizId][batchId] = [];
            
            // if old structure had months
            if (!Array.isArray(configs[bizId][batchId])) {
                for (const month in configs[bizId][batchId]) {
                    if (Array.isArray(configs[bizId][batchId][month])) {
                        newConfigs[bizId][batchId].push(...configs[bizId][batchId][month]);
                    }
                }
            } else {
                newConfigs[bizId][batchId] = configs[bizId][batchId];
            }
        }
    }
    
    await prisma.appSetting.update({
        where: { key: 'GSHEET_CONFIGS' },
        data: { value: JSON.stringify(newConfigs) }
    });
    console.log("Migrated successfully", JSON.stringify(newConfigs));
}
migrate();
