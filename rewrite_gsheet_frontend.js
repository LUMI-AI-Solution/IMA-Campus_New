const fs = require('fs');

let code = fs.readFileSync('frontend/src/components/admin/AISlipVerification.jsx', 'utf8');

// I am going to replace the simple \`months\` state and API with a hierarchical UI for GSheet
// I will just append a new settings tab called "gsheets"
// And add a button to the settings sidebar:
// \`<button onClick={() => setActiveSettingsTab('gsheets')} ...> Google Sheets </button>\`

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

// Now I will inject the new tab content into the rendering area
const gsheetsTabContent = `
                    {/* --- TAB: GSHEETS SETUP --- */}
                    {activeSettingsTab === 'gsheets' && (
                        <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 h-full overflow-y-auto">
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Database className="text-cyan-400"/> Google Sheets Directories</h2>
                            
                            <div className="flex gap-4 mb-6">
                                <input 
                                    type="text" 
                                    placeholder="New Folder Name..."
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    className="bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:border-cyan-500 outline-none flex-1"
                                />
                                <button 
                                    onClick={() => {
                                        if(!newFolderName.trim()) return toast.error("Folder name required");
                                        const t = {...gsheetTree};
                                        if(t[newFolderName]) return toast.error("Folder already exists");
                                        t[newFolderName] = {};
                                        setGsheetTree(t);
                                        saveGsheetTree(t);
                                        setNewFolderName('');
                                    }}
                                    className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg font-medium transition"
                                >
                                    Add Folder
                                </button>
                            </div>

                            <div className="space-y-4">
                                {Object.keys(gsheetTree).map(folder => (
                                    <div key={folder} className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                                        <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-700">
                                            <h3 className="text-lg font-semibold text-white flex items-center gap-2 cursor-pointer" onClick={() => setSelectedFolder(selectedFolder === folder ? null : folder)}>
                                                {selectedFolder === folder ? <FolderOpen className="text-cyan-400" size={20}/> : <Folder className="text-cyan-400" size={20}/>}
                                                {folder}
                                            </h3>
                                            <button 
                                                onClick={() => {
                                                    if(window.confirm("Delete folder and all its months?")) {
                                                        const t = {...gsheetTree};
                                                        delete t[folder];
                                                        setGsheetTree(t);
                                                        saveGsheetTree(t);
                                                    }
                                                }}
                                                className="text-red-400 hover:text-red-300 text-xs"
                                            >Delete Folder</button>
                                        </div>

                                        {selectedFolder === folder && (
                                            <div className="pl-6 space-y-4">
                                                <div className="flex gap-3 mb-4">
                                                    <input 
                                                        type="text"
                                                        placeholder="Add Month (e.g. 2026-06)"
                                                        value={newMonthName}
                                                        onChange={(e) => setNewMonthName(e.target.value)}
                                                        className="bg-gray-900 border border-gray-700 text-white rounded px-3 py-1.5 text-sm focus:border-cyan-500 outline-none w-64"
                                                    />
                                                    <button 
                                                        onClick={() => {
                                                            if(!newMonthName.trim()) return toast.error("Month name required");
                                                            const t = {...gsheetTree};
                                                            if(t[folder][newMonthName]) return toast.error("Month already exists in this folder");
                                                            t[folder][newMonthName] = [];
                                                            setGsheetTree(t);
                                                            saveGsheetTree(t);
                                                            setNewMonthName('');
                                                        }}
                                                        className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded text-sm transition"
                                                    >Add Month</button>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {Object.keys(gsheetTree[folder]).map(month => (
                                                        <div key={month} className="bg-black/40 border border-gray-800 rounded-lg p-3">
                                                            <div className="flex justify-between items-center mb-2">
                                                                <span className="font-medium text-emerald-400">{month}</span>
                                                                <button 
                                                                    onClick={() => {
                                                                        const t = {...gsheetTree};
                                                                        delete t[folder][month];
                                                                        setGsheetTree(t);
                                                                        saveGsheetTree(t);
                                                                    }}
                                                                    className="text-red-400 hover:text-red-300 text-[10px]"
                                                                >Remove Month</button>
                                                            </div>
                                                            <div className="space-y-2 mb-2">
                                                                {gsheetTree[folder][month].map((link, idx) => (
                                                                    <div key={idx} className="flex gap-2 items-center">
                                                                        <input type="text" value={link} readOnly className="flex-1 bg-gray-900 border border-gray-700 text-gray-300 text-[10px] rounded px-2 py-1" />
                                                                        <button 
                                                                            onClick={() => {
                                                                                const t = {...gsheetTree};
                                                                                t[folder][month].splice(idx, 1);
                                                                                setGsheetTree(t);
                                                                                saveGsheetTree(t);
                                                                            }}
                                                                            className="text-red-500 hover:text-red-400"
                                                                        ><XCircle size={14}/></button>
                                                                    </div>
                                                                ))}
                                                                {gsheetTree[folder][month].length === 0 && <span className="text-[10px] text-gray-600">No links added</span>}
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <input 
                                                                    type="text" 
                                                                    placeholder="Paste GSheet link..."
                                                                    className="flex-1 bg-gray-800 border border-gray-700 text-white rounded px-2 py-1 text-xs focus:border-cyan-500 outline-none"
                                                                    onKeyDown={(e) => {
                                                                        if(e.key === 'Enter') {
                                                                            const val = e.target.value.trim();
                                                                            if(!val) return;
                                                                            let sheetId = val;
                                                                            const match = val.match(/\\/d\\/([a-zA-Z0-9-_]+)/);
                                                                            if(match) sheetId = match[1];
                                                                            const t = {...gsheetTree};
                                                                            t[folder][month].push(sheetId);
                                                                            setGsheetTree(t);
                                                                            saveGsheetTree(t);
                                                                            e.target.value = '';
                                                                        }
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
`;

code = code.replace(/\{activeSettingsTab !== 'chat' && \(/, gsheetsTabContent + "\n                    {activeSettingsTab !== 'chat' && (");

// Remove the old month selector and upload section from Vault
// We will change the month selector in the Vault to be just a dropdown of all available months across all folders for simplicity.
// Actually, let's keep the existing vault month selector intact. It already fetches months from the backend. 
// Oh wait! The backend `getBankStatementMonths` endpoint needs to return the unique months across ALL folders!
fs.writeFileSync('frontend/src/components/admin/AISlipVerification.jsx', code);

