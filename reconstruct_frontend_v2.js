const fs = require('fs');

console.log("Starting reconstruction v2...");
let code = fs.readFileSync('/root/IMA-Campus-Staging/frontend/src/components/admin/AISlipVerification.jsx', 'utf8');

// 1. STATE (gsheetTree)
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

// 2. SETTINGS TAB BUTTON
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

// 3. SETTINGS TAB CONTENT
let gsheetsTabContent = fs.readFileSync('rewrite_gsheet_frontend.js', 'utf-8');
const gsheetMatch = gsheetsTabContent.match(/const gsheetsTabContent = `([\s\S]+?)`;/);
if (gsheetMatch) {
    code = code.replace(/\{activeSettingsTab !== 'chat' && \(/, gsheetMatch[1] + "\n                    {activeSettingsTab !== 'chat' && (");
}

// 4. VAULT UI
let vaultScript = fs.readFileSync('replace_vault_ui.js', 'utf-8');
const vaultMatch = vaultScript.match(/const newVaultUI = `([\s\S]+?)`;/);
if (vaultMatch) {
    const vaultStart = code.indexOf('{/* BOTTOM PANEL: BANK STATEMENT VAULT */}');
    if (vaultStart !== -1) {
        const remaining = code.substring(vaultStart);
        const endMatch = remaining.match(/<\/div>\s*<\/div>\s*<\/div>\s*\);\s*\};/);
        if (endMatch) {
            code = code.substring(0, vaultStart) + vaultMatch[1] + '\n' + remaining.substring(endMatch.index);
        }
    }
}

// 5. REMOVE OLD HUD
code = code.replace(
    /\{isVerifying && <ScanningAnimation targetSlipConfig=\{targetSlipConfig\} banksConfig=\{banksConfig\} \/>\}/g,
    ''
);

// 6. INJECT 3-COLUMN HUD (from scratch_ui.jsx)
let scratchUi = fs.readFileSync('backend/scratch_ui.jsx', 'utf-8');
// The scratch_ui has `{/* VERIFICATION ANIMATION OVERLAY - PREMIUM MILITARY HUD */}` at the start
const lastDivIndex = code.lastIndexOf('</div>');
code = code.substring(0, lastDivIndex) + "\n\n" + scratchUi + "\n" + code.substring(lastDivIndex);

if (!code.includes('createPortal')) {
    code = code.replace(
        "import React, { useState, useEffect, useRef } from 'react';",
        "import React, { useState, useEffect, useRef } from 'react';\nimport { createPortal } from 'react-dom';"
    );
}

// Fix missing imports for Vault and HUD
if (!code.includes('Settings')) {
    code = code.replace(/import {([^}]+)} from 'lucide-react';/, "import { Settings, FolderOpen, Folder, Trash2, XCircle, $1 } from 'lucide-react';");
} else {
    code = code.replace(/import {([^}]+)} from 'lucide-react';/, "import { FolderOpen, Folder, Trash2, XCircle, $1 } from 'lucide-react';");
}

fs.writeFileSync('/root/IMA-Campus/frontend/src/components/admin/AISlipVerification.jsx', code);
console.log("Reconstructed!");
