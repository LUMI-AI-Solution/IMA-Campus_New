const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const aiController = require('./controllers/aiVerificationController');

// Expose the internal helper if we can, but since it's not exported, I will just copy its logic exactly.
async function test() {
    const targetBatchId = 31;
    const configSetting = await prisma.appSetting.findUnique({ where: { key: 'GSHEET_CONFIGS' } });
    if (!configSetting || !configSetting.value) return console.log("NO CONFIG");

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
}
test().finally(() => prisma.$disconnect());
