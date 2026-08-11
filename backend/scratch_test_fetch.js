const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fetchGSheetTransactions(targetBatchId = null) {
    const configSetting = await prisma.appSetting.findUnique({ where: { key: 'GSHEET_CONFIGS' } });
    if (!configSetting || !configSetting.value) return { headers: [], rows: [] };
    const configs = JSON.parse(configSetting.value);
    let spreadsheetIds = [];
    for (const bizId in configs) {
        if (typeof configs[bizId] === 'object' && configs[bizId] !== null) {
            for (const batchId in configs[bizId]) {
                if (targetBatchId && String(batchId) === String(targetBatchId)) {
                    if (Array.isArray(configs[bizId][batchId])) {
                        spreadsheetIds.push(...configs[bizId][batchId]);
                    }
                }
            }
        }
    }
    console.log(`fetchGSheetTransactions for batch ${targetBatchId}: Found IDs:`, spreadsheetIds);
    return spreadsheetIds;
}

fetchGSheetTransactions(31).finally(() => prisma.$disconnect());
