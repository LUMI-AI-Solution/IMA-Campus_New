const fs = require('fs');

console.log("Fixing UI based on user request...");
let code = fs.readFileSync('/root/IMA-Campus-Staging/frontend/src/components/admin/AISlipVerification.jsx', 'utf8');

// 1. Add gsheet state
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

// 2. Settings Tab for GSheets
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
const gsheetMatch = gsheetsTabContent.match(/const gsheetsTabContent = \`([\s\S]+?)\`;/);
if (gsheetMatch) {
    code = code.replace(/\{activeSettingsTab !== 'chat' && \(/, gsheetMatch[1] + "\n                    {activeSettingsTab !== 'chat' && (");
}

// 3. Vault UI (Folder & Links)
let vaultScript = fs.readFileSync('replace_vault_ui.js', 'utf-8');
const vaultMatch = vaultScript.match(/const newVaultUI = \`([\s\S]+?)\`;/);
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

// 4. Remove AI Command Console & Fix Col-span
code = code.replace(/lg:col-span-8/, 'lg:col-span-12');
const rightPanelStart = code.indexOf('{/* RIGHT PANEL: AI COMMAND CONSOLE */}');
if (rightPanelStart !== -1) {
    // Find the end of the right panel div
    // It's a div containing another div.
    const rightPanelEndStr = '</div>\n        </div>\n\n      </div>\n\n      {/* BOTTOM PANEL';
    const endMatch = code.indexOf(rightPanelEndStr, rightPanelStart);
    if (endMatch !== -1) {
        // We replace from rightPanelStart to endMatch + '</div>\n        </div>'.length
        // Wait, actually, let's just regex out the whole panel to be safe.
        code = code.substring(0, rightPanelStart) + code.substring(endMatch + 21); // 21 is '</div>\n        </div>\n'.length
    }
}

// 5. Green Theme for ScanningAnimation
const replaceGreen = (text) => {
    return text.replace(/border-cyan-400/g, 'border-emerald-400')
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
           .replace(/rgba\(34,211,238/g, 'rgba(16,185,129');
};

const animStart = code.indexOf('const ScanningAnimation');
const animEnd = code.indexOf('export default function AISlipVerification');
if (animStart !== -1 && animEnd !== -1) {
    let animCode = code.substring(animStart, animEnd);
    animCode = replaceGreen(animCode);
    code = code.substring(0, animStart) + animCode + code.substring(animEnd);
}

// 6. Fix Missing Imports
if (!code.includes('Settings')) {
    code = code.replace(/import {([^}]+)} from 'lucide-react';/, "import { Settings, FolderOpen, Folder, Trash2, XCircle, $1 } from 'lucide-react';");
} else {
    code = code.replace(/import {([^}]+)} from 'lucide-react';/, "import { FolderOpen, Folder, Trash2, XCircle, X, $1 } from 'lucide-react';");
}

fs.writeFileSync('/root/IMA-Campus/frontend/src/components/admin/AISlipVerification.jsx', code);
console.log("UI fixed and saved!");
