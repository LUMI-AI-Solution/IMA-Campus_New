const fs = require('fs');
const filePath = '/root/IMA-Campus/backend/controllers/aiVerificationController.js';
let content = fs.readFileSync(filePath, 'utf8');

const newMonthsLogic = `
exports.getBankStatementMonths = async (req, res) => {
    try {
        const configSetting = await prisma.appSetting.findUnique({ where: { key: 'GSHEET_CONFIGS' } });
        if (configSetting && configSetting.value) {
            const configs = JSON.parse(configSetting.value);
            return res.status(200).json(Object.keys(configs));
        }
        res.status(200).json([]);
    } catch(err) {
        res.status(500).json({ error: "Failed to fetch months" });
    }
};
`;

const startIndex = content.indexOf('exports.getBankStatementMonths = async (req, res) => {');
const endIndex = content.indexOf('function fileToGenerativePart(filePath, mimeType) {');

if (startIndex !== -1 && endIndex !== -1) {
    const newContent = content.slice(0, startIndex) + newMonthsLogic + '\n' + content.slice(endIndex);
    fs.writeFileSync(filePath, newContent);
    console.log('Successfully updated getBankStatementMonths logic in controller.');
} else {
    console.error('Could not find function boundaries.');
}
