const fs = require('fs');
const filePath = '/root/IMA-Campus/backend/controllers/aiVerificationController.js';
let content = fs.readFileSync(filePath, 'utf8');

const newUploadLogic = `
exports.uploadBankStatement = async (req, res) => {
    const { month, bankName, spreadsheetUrl } = req.body;
    if (!spreadsheetUrl) {
        return res.status(400).json({ error: "Google Sheet URL is required" });
    }
    if (!month) {
        return res.status(400).json({ error: "Target month is required" });
    }

    try {
        let spreadsheetId = spreadsheetUrl;
        const match = spreadsheetUrl.match(/\\/d\\/([a-zA-Z0-9-_]+)/);
        if (match) {
            spreadsheetId = match[1];
        }

        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        let configs = {};
        const configSetting = await prisma.appSetting.findUnique({ where: { key: 'GSHEET_CONFIGS' } });
        if (configSetting && configSetting.value) {
            configs = JSON.parse(configSetting.value);
        }

        configs[month] = { bankName, spreadsheetId };

        await prisma.appSetting.upsert({
            where: { key: 'GSHEET_CONFIGS' },
            update: { value: JSON.stringify(configs) },
            create: { key: 'GSHEET_CONFIGS', value: JSON.stringify(configs) }
        });

        res.status(200).json({ 
            message: "Google Sheet linked successfully!"
        });

    } catch (error) {
        console.error("[uploadBankStatement] Error:", error);
        res.status(500).json({ error: "Failed to link Google Sheet" });
    }
};
`;

// Replace the existing uploadBankStatement function.
// I'll search for 'exports.uploadBankStatement = async (req, res) => {'
// and replace until 'exports.clearBankStatements = async (req, res) => {'

const startIndex = content.indexOf('exports.uploadBankStatement = async (req, res) => {');
const endIndex = content.indexOf('exports.clearBankStatements = async (req, res) => {');

if (startIndex !== -1 && endIndex !== -1) {
    const newContent = content.slice(0, startIndex) + newUploadLogic + '\n' + content.slice(endIndex);
    fs.writeFileSync(filePath, newContent);
    console.log('Successfully updated uploadBankStatement logic in controller.');
} else {
    console.error('Could not find function boundaries.');
}
