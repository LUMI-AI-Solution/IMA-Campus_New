const fs = require('fs');

console.log("Starting reconstruction...");
// 1. Copy from Staging
let code = fs.readFileSync('/root/IMA-Campus-Staging/frontend/src/components/admin/AISlipVerification.jsx', 'utf8');

// 2. update_frontend_gsheet.js (State)
const stateInsert = `
  const [gsheetTree, setGsheetTree] = useState({ "Default Folder": {} });
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [newMonthName, setNewMonthName] = useState('');
  const [newSheetLink, setNewSheetLink] = useState('');

  const fetchGsheetTree = async () => {
    try {
      const res = await api.get('/ai-verification/gsheet-config/tree');
      setGsheetTree(res.data && Object.keys(res.data).length > 0 ? res.data : { "Default Folder": {} });
    } catch (err) {
      console.error(err);
    }
  };

  const saveGsheetTree = async (tree) => {
    try {
      await api.post('/ai-verification/gsheet-config/tree', { configs: tree });
      toast.success("Saved Google Sheets configuration");
    } catch(err) {
      toast.error("Failed to save config");
    }
  };

  useEffect(() => {
    fetchGsheetTree();
  }, []);
`;
if (!code.includes('fetchGsheetTree')) {
    code = code.replace(/const \[activeTab, setActiveTab\] = useState\('pending'\);/, "const [activeTab, setActiveTab] = useState('pending');\n" + stateInsert);
}

// 3. rewrite_gsheet_frontend.js (Settings Tab)
code = code.replace(
    /<button\s+onClick=\{\(\) => setActiveSettingsTab\('core'\)\}[\s\S]*?Core Engine Settings\s*<\/button>/,
    `$&
                            <button 
                                onClick={() => setActiveSettingsTab('gsheets')}
                                className={\`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium \${activeSettingsTab === 'gsheets' ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'}\`}
                            >
                                <Database size={18} /> Google Sheets Setup
                            </button>`
);

let gsheetsTabContent = fs.readFileSync('rewrite_gsheet_frontend.js', 'utf-8');
const gsheetMatch = gsheetsTabContent.match(/const gsheetsTabContent = `([\s\S]+?)`;/);
if (gsheetMatch) {
    code = code.replace(/\{activeSettingsTab !== 'chat' && \(/, gsheetMatch[1] + "\n                    {activeSettingsTab !== 'chat' && (");
}

// 4. replace_vault_ui.js (Vault UI)
let vaultScript = fs.readFileSync('replace_vault_ui.js', 'utf-8');
const vaultMatch = vaultScript.match(/const newVaultUI = `([\s\S]+?)`;/);
if (vaultMatch) {
    // We need to replace the vault. In staging it starts with `{/* BOTTOM PANEL: BANK STATEMENT VAULT */}`
    // and ends after the min-h-[300px] div closes.
    // Let's just find the start of Vault, and since we know it's near the end of the file, we can replace up to the last `</div>`
    const vaultStart = code.indexOf('{/* BOTTOM PANEL: BANK STATEMENT VAULT */}');
    if (vaultStart !== -1) {
        // Find the index of `</div>` just before `</div>\n      </div>\n    </div>\n  );\n};`
        const remaining = code.substring(vaultStart);
        // In React, Vault is the last block inside the main flex container.
        const endMatch = remaining.match(/<\/div>\s*<\/div>\s*<\/div>\s*\);\s*\};/);
        if (endMatch) {
            code = code.substring(0, vaultStart) + vaultMatch[1] + '\n' + remaining.substring(endMatch.index);
        }
    }
}

// 5. restore_hud.js (HUD overlay)
code = code.replace(
    /\{isVerifying && <ScanningAnimation targetSlipConfig=\{targetSlipConfig\} banksConfig=\{banksConfig\} \/>\}/g,
    ''
);

let restoreScript = fs.readFileSync('restore_hud.js', 'utf-8');
const hudMatch = restoreScript.match(/const hudOverlay = `([\s\S]+?)`;/);
if (hudMatch) {
    const lastDivIndex = code.lastIndexOf('</div>');
    code = code.substring(0, lastDivIndex) + hudMatch[1] + code.substring(lastDivIndex);
    if (!code.includes('createPortal')) {
        code = code.replace(
            "import React, { useState, useEffect, useRef } from 'react';",
            "import React, { useState, useEffect, useRef } from 'react';\nimport { createPortal } from 'react-dom';"
        );
    }
}

// 6. make_green_hud.js (Green colors in HUD)
// We already have the HUD code inside `code` now. We can apply the replacements to `code`.
code = code.replace(/border-cyan-400/g, 'border-emerald-400')
           .replace(/text-cyan-400/g, 'text-emerald-400')
           .replace(/text-cyan-500/g, 'text-emerald-500')
           .replace(/bg-cyan-400/g, 'bg-emerald-400')
           .replace(/border-cyan-500/g, 'border-emerald-500')
           .replace(/text-cyan-300/g, 'text-emerald-300')
           .replace(/bg-cyan-500/g, 'bg-emerald-500')
           .replace(/text-cyan-900/g, 'text-emerald-900')
           .replace(/border-cyan-900\/30/g, 'border-emerald-900/30')
           .replace(/border-cyan-500\/30/g, 'border-emerald-500/30')
           .replace(/border-cyan-500\/20/g, 'border-emerald-500/20')
           .replace(/rgba\(34,211,238/g, 'rgba(16,185,129')
           .replace(/text-blue-400/g, 'text-emerald-400')
           .replace(/bg-blue-600/g, 'bg-emerald-600')
           .replace(/text-orange-400/g, 'text-emerald-400');

code = code.replace(/0x00A1: INIT NEURAL_NET_V9/g, "0x00A1: INIT SECURE_TERMINAL_V2");
code = code.replace(/0x00A4: UPLINKING TO MAINFRAME.../g, "0x00A4: UPLINKING TO VERIFICATION_SERVER...");
code = code.replace(/0x00A5: RUNNING MATCH ALGORITHM/g, "0x00A5: EXECUTING VERIFICATION_MATCH...");
code = code.replace(/0x00A6: SEQUENCE COMPLETE./g, "0x00A6: VERIFICATION MATCH SECURED.");

// 7. apply fix_middle.js 
// Wait, the fix_middle.js was meant to modify the MASSIVE radar HUD which is in backend/scratch_ui.jsx.
// In the current `code` (because we ran restore_hud.js), we have the 2-column HUD!
// The user wanted the THREE-column HUD (radar) but with the terminal in the middle!
// So actually, I should NOT inject `restore_hud.js`'s 2-column HUD!
// I should inject the modified `backend/scratch_ui.jsx`!
