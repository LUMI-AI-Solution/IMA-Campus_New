const fs = require('fs');

let controllerCode = fs.readFileSync('backend/controllers/aiVerificationController.js', 'utf8');

// The getBankStatementMonths currently does:
//         if (configSetting && configSetting.value) {
//             const configs = JSON.parse(configSetting.value);
//             return res.status(200).json(Object.keys(configs));
//         }
// We need to change it to collect all months from all folders and deduplicate.

const regexGetMonths = /exports\.getBankStatementMonths = async \(req, res\) => \{[\s\S]*?res\.status\(200\)\.json\(\[\]\);\n    \} catch\(err\) \{/g;

controllerCode = controllerCode.replace(regexGetMonths, `exports.getBankStatementMonths = async (req, res) => {
    try {
        const configSetting = await prisma.appSetting.findUnique({ where: { key: 'GSHEET_CONFIGS' } });
        if (configSetting && configSetting.value) {
            const configs = JSON.parse(configSetting.value);
            const allMonths = new Set();
            for (const folderName in configs) {
                Object.keys(configs[folderName]).forEach(month => allMonths.add(month));
            }
            return res.status(200).json(Array.from(allMonths));
        }
        res.status(200).json([]);
    } catch(err) {`);

fs.writeFileSync('backend/controllers/aiVerificationController.js', controllerCode);
