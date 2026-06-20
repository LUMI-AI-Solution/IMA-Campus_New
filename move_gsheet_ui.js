const fs = require('fs');

let content = fs.readFileSync('frontend/src/components/admin/AISlipVerification.jsx', 'utf-8');

// 1. Remove the "Google Sheets Setup" tab button from the Settings Modal
content = content.replace(
    /<button[^>]*onClick=\{\(\) => setActiveSettingsTab\('gsheet_config'\)\}[^>]*>[\s\S]*?<\/button>/,
    ''
);

// 2. Remove the "Google Sheets Setup" panel from the Settings Modal
const gsheetSetupPanelRegex = /\{activeSettingsTab === 'gsheet_config' && \([\s\S]*?\}\s*\)\}/;
const match = content.match(gsheetSetupPanelRegex);
let gsheetPanelCode = '';
if (match) {
    gsheetPanelCode = match[0];
    content = content.replace(gsheetSetupPanelRegex, '');
    
    // Clean up the extracted code to render independently
    gsheetPanelCode = gsheetPanelCode.replace(/\{activeSettingsTab === 'gsheet_config' && \(\s*/, '');
    gsheetPanelCode = gsheetPanelCode.substring(0, gsheetPanelCode.lastIndexOf(')}'));
    
    // Replace the old Bank Statement Vault with the new UI!
    const vaultRegex = /\{\/\* BOTTOM PANEL: BANK STATEMENT VAULT \*\/\}([\s\S]*?)<\/div>\n\n      \{\/\* NEW MONTH MODAL \*\/\}/;
    
    const newVaultCode = `
      {/* BOTTOM PANEL: BANK STATEMENT VAULT */}
      <div className="flex flex-col gap-6 mt-6">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-lg flex flex-col min-h-[300px]">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-800">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2 cursor-pointer hover:text-emerald-400 transition" onClick={() => setIsBankStatementsMinimized(!isBankStatementsMinimized)}>
                        <Database className="text-emerald-500 animate-pulse" size={20} /> Bank Statement Vault (Folder & Links)
                        <span className="text-[10px] text-gray-500 ml-2 border border-gray-700 px-1.5 py-0.5 rounded">
                            {isBankStatementsMinimized ? 'EXPAND' : 'MINIMIZE'}
                        </span>
                    </h2>
                </div>
                {!isBankStatementsMinimized && (
                    <div className="flex-1 overflow-hidden">
                        ${gsheetPanelCode.replace(/className="flex-1 overflow-y-auto p-6 bg-black\/20"/, 'className="w-full flex flex-col"')}
                    </div>
                )}
            </div>
      </div>
    `;
    
    content = content.replace(vaultRegex, newVaultCode + '\n\n      {/* NEW MONTH MODAL */}');
    console.log("Moved GSheet UI successfully.");
} else {
    console.log("Could not find GSheet Setup Panel.");
}

fs.writeFileSync('frontend/src/components/admin/AISlipVerification.jsx', content);

