const fs = require('fs');

let content = fs.readFileSync('frontend/src/components/admin/AISlipVerification.jsx', 'utf-8');
const lines = content.split('\n');

const newVaultUI = `      {/* BOTTOM PANEL: BANK STATEMENT VAULT */}
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
                    <div className="flex flex-col md:flex-row gap-6">
                        {/* LEFT: FOLDERS LIST */}
                        <div className="w-full md:w-64 flex flex-col gap-3">
                            <div className="font-bold text-emerald-400 border-b border-emerald-900/50 pb-2 flex justify-between items-center">
                                FOLDERS
                            </div>
                            <div className="flex gap-2 mb-2">
                                <input 
                                    type="text" 
                                    placeholder="New Folder..." 
                                    value={newFolderName}
                                    onChange={e => setNewFolderName(e.target.value)}
                                    className="flex-1 bg-black/40 border border-gray-700 text-xs px-2 py-1.5 rounded outline-none focus:border-emerald-500 text-white"
                                />
                                <button onClick={handleAddFolder} className="bg-emerald-600 hover:bg-emerald-500 px-2 rounded text-white"><Plus size={14}/></button>
                            </div>
                            <div className="flex flex-col gap-1 overflow-y-auto max-h-[300px] custom-scrollbar">
                                {Object.keys(gsheetConfigTree || {}).map(folder => (
                                    <div key={folder} className={\`flex items-center justify-between p-2 rounded cursor-pointer transition-colors \${selectedFolder === folder ? 'bg-emerald-900/40 border border-emerald-500/50' : 'bg-gray-800/50 hover:bg-gray-800 border border-transparent'}\`} onClick={() => { setSelectedFolder(folder); setSelectedMonth(''); }}>
                                        <div className="flex items-center gap-2 text-sm text-gray-200">
                                            <FolderOpen size={14} className={selectedFolder === folder ? "text-emerald-400" : "text-gray-400"} />
                                            {folder}
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder); }} className="text-red-400/50 hover:text-red-400"><Trash2 size={12}/></button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* RIGHT: FOLDER CONTENT (MONTHS & LINKS) */}
                        <div className="flex-1 bg-black/30 border border-gray-800 rounded-xl p-4 flex flex-col">
                            {!selectedFolder ? (
                                <div className="text-gray-500 text-center py-10">Select a folder to view configurations</div>
                            ) : (
                                <>
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-emerald-400 font-bold flex items-center gap-2">
                                            <FolderOpen size={16}/> {selectedFolder}
                                        </h3>
                                        <button onClick={() => setShowNewMonthModal(true)} className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded flex items-center gap-1 border border-gray-700">
                                            <Plus size={12}/> Add Month
                                        </button>
                                    </div>

                                    {/* Month Tabs */}
                                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar mb-4 border-b border-gray-800">
                                        {Object.keys(gsheetConfigTree[selectedFolder] || {}).map(month => (
                                            <div key={month} className="flex flex-col gap-1 relative group">
                                                <button 
                                                    onClick={() => setSelectedMonth(month)}
                                                    className={\`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors \${selectedMonth === month ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'}\`}
                                                >
                                                    {month}
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteMonthInFolder(selectedFolder, month)}
                                                    className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X size={10} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Links for Selected Month */}
                                    {selectedMonth ? (
                                        <div className="flex-1">
                                            <div className="flex gap-2 mb-4 bg-gray-900 p-2 rounded-lg border border-gray-800">
                                                <input 
                                                    type="url"
                                                    placeholder="Paste Google Sheet Link here..."
                                                    value={spreadsheetUrl}
                                                    onChange={e => setSpreadsheetUrl(e.target.value)}
                                                    className="flex-1 bg-black/40 border border-gray-700 text-xs px-3 py-1.5 rounded outline-none focus:border-cyan-500 text-white"
                                                />
                                                <button 
                                                    onClick={() => handleAddLink(selectedFolder, selectedMonth)}
                                                    disabled={!spreadsheetUrl}
                                                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-4 py-1.5 rounded disabled:opacity-50"
                                                >
                                                    Link Sheet
                                                </button>
                                            </div>

                                            <div className="flex flex-col gap-2">
                                                <div className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">Linked Spreadsheets</div>
                                                {(gsheetConfigTree[selectedFolder][selectedMonth] || []).length === 0 ? (
                                                    <div className="text-gray-600 text-xs text-center py-4">No spreadsheets linked to {selectedMonth} yet.</div>
                                                ) : (
                                                    (gsheetConfigTree[selectedFolder][selectedMonth] || []).map((linkId, i) => (
                                                        <div key={i} className="flex justify-between items-center bg-gray-800/40 border border-gray-700 p-3 rounded-lg hover:border-emerald-500/50 transition-colors">
                                                            <div className="flex items-center gap-3">
                                                                <FileText size={16} className="text-emerald-500"/>
                                                                <div className="flex flex-col">
                                                                    <span className="text-gray-200 text-xs font-mono">ID: {linkId}</span>
                                                                    <span className="text-gray-500 text-[10px]">Data will be fetched from all tabs inside this sheet.</span>
                                                                </div>
                                                            </div>
                                                            <button 
                                                                onClick={() => handleDeleteLink(selectedFolder, selectedMonth, i)}
                                                                className="text-red-400 hover:text-red-300 bg-red-900/20 hover:bg-red-900/40 p-1.5 rounded transition-colors"
                                                            >
                                                                <Trash2 size={14}/>
                                                            </button>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-gray-500 text-center py-10">Select or create a month to link spreadsheets.</div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
`;

// Replace lines 1275 to 1461 with newVaultUI
lines.splice(1274, 1461 - 1274 + 1, newVaultUI);

fs.writeFileSync('frontend/src/components/admin/AISlipVerification.jsx', lines.join('\n'));
console.log("Vault UI successfully replaced!");
