const fs = require('fs');
let code = fs.readFileSync('backend/controllers/aiVerificationController.js', 'utf8');

// We need to update fetchGSheetTransactions to prioritize googleapis and fetch all tabs
// We can just comment out or remove the Web App reading logic from fetchGSheetTransactions
// and use googleapis directly with GSHEET_SERVICE_ACCOUNT or the API key.

code = code.replace(/const webAppSetting = await prisma\.appSetting\.findUnique\(\{ where: \{ key: 'GSHEET_WEB_APP_URL' \} \}\);[\s\S]*?let allSheetValues = \[\];\s*if \(!values \|\| values\.length === 0\) \{/g, `let allSheetValues = [];\n            if (true) {`);

fs.writeFileSync('backend/controllers/aiVerificationController.js', code);
