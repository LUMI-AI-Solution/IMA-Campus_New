const fs = require('fs');

let controllerCode = fs.readFileSync('backend/controllers/aiVerificationController.js', 'utf8');

const newEndpoints = `
exports.getGsheetConfigTree = async (req, res) => {
    try {
        const configSetting = await prisma.appSetting.findUnique({ where: { key: 'GSHEET_CONFIGS' } });
        let configs = {};
        if (configSetting && configSetting.value) {
            configs = JSON.parse(configSetting.value);
            // Migrate old structure if necessary
            if (Object.keys(configs).length > 0 && !Object.keys(configs)[0].includes("Folder") && typeof Object.values(configs)[0] === 'object' && Object.values(configs)[0].spreadsheetId) {
                const migrated = { "Default Folder": {} };
                for (const [month, data] of Object.entries(configs)) {
                    migrated["Default Folder"][month] = [data.spreadsheetId];
                }
                configs = migrated;
                await prisma.appSetting.upsert({
                    where: { key: 'GSHEET_CONFIGS' },
                    update: { value: JSON.stringify(configs) },
                    create: { key: 'GSHEET_CONFIGS', value: JSON.stringify(configs) }
                });
            }
        }
        res.status(200).json(configs);
    } catch(err) {
        res.status(500).json({ error: "Failed to fetch gsheet config" });
    }
};

exports.saveGsheetConfigTree = async (req, res) => {
    try {
        const { configs } = req.body;
        await prisma.appSetting.upsert({
            where: { key: 'GSHEET_CONFIGS' },
            update: { value: JSON.stringify(configs) },
            create: { key: 'GSHEET_CONFIGS', value: JSON.stringify(configs) }
        });
        res.status(200).json({ message: "Config saved successfully" });
    } catch(err) {
        res.status(500).json({ error: "Failed to save gsheet config" });
    }
};
`;

if (!controllerCode.includes('getGsheetConfigTree')) {
    controllerCode += newEndpoints;
    fs.writeFileSync('backend/controllers/aiVerificationController.js', controllerCode);
}
