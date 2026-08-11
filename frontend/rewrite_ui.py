import re

with open('/root/IMA-Campus/frontend/src/components/admin/AISlipVerification.jsx', 'r') as f:
    content = f.read()

ui_start = content.find('{/* LEFT PANEL: PENDING SLIPS & VERIFICATION */}')
ui_end = content.find('{/* BOTTOM PANEL: BANK STATEMENT VAULT */}')

new_ui = """
        {/* BULK VERIFICATION DASHBOARD */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 mb-6 shadow-xl relative overflow-hidden">
            {bulkStatus?.isRunning && (
                <div className="absolute top-0 left-0 w-full h-1 bg-gray-800">
                    <div className="h-full bg-emerald-500 shadow-[0_0_10px_#10b981] transition-all duration-500" style={{width: `${(bulkStatus.processed / bulkStatus.total) * 100}%`}}></div>
                </div>
            )}
            
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex-1">
                    <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                        <Bot className={bulkStatus?.isRunning ? 'text-emerald-400 animate-pulse' : 'text-gray-400'} />
                        Auto-Verification Engine
                    </h2>
                    <p className="text-sm text-gray-400">
                        Automatically scans all pending slips, detects the bank template, and verifies against the Google Sheet.
                    </p>
                    
                    {bulkStatus?.isRunning && (
                        <div className="mt-4 flex flex-wrap gap-4 text-xs font-mono">
                            <div className="bg-gray-800 px-3 py-1.5 rounded text-blue-400">Processing: {bulkStatus.processed} / {bulkStatus.total}</div>
                            <div className="bg-emerald-900/30 px-3 py-1.5 rounded text-emerald-400 flex items-center gap-1"><CheckCircle size={12}/> Matched: {bulkStatus.success}</div>
                            <div className="bg-red-900/30 px-3 py-1.5 rounded text-red-400 flex items-center gap-1"><AlertCircle size={12}/> Needs Review: {bulkStatus.failed}</div>
                        </div>
                    )}
                </div>
                
                <button 
                    onClick={startBatchVerification}
                    disabled={bulkStatus?.isRunning || pendingSlips.length === 0}
                    className={`py-3 px-8 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition whitespace-nowrap ${bulkStatus?.isRunning ? 'bg-blue-900/50 border border-blue-500/30 cursor-not-allowed' : pendingSlips.length === 0 ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]'}`}
                >
                    {bulkStatus?.isRunning ? (
                        <><Loader className="animate-spin" size={20} /> Verifying Background...</>
                    ) : (
                        <><Search size={20} /> Start Bulk Auto-Verify</>
                    )}
                </button>
            </div>
        </div>

        {/* TABS & SLIPS CARDS */}
        <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 shadow-xl mb-6">
            <div className="flex gap-4 mb-6 border-b border-gray-800 pb-2 overflow-x-auto custom-scrollbar">
                <button onClick={() => {setActiveTab('pending'); setSelectedStatus('0');}} className={`pb-2 px-4 font-bold transition-colors whitespace-nowrap ${activeTab==='pending' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300'}`}>Pending Slips ({pendingSlips.filter(s=>s.status===0).length})</button>
                <button onClick={() => {setActiveTab('verified'); setSelectedStatus('1');}} className={`pb-2 px-4 font-bold transition-colors whitespace-nowrap ${activeTab==='verified' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-gray-500 hover:text-gray-300'}`}>AI Verified</button>
                <button onClick={() => {setActiveTab('needsReview'); setSelectedStatus('2');}} className={`pb-2 px-4 font-bold transition-colors whitespace-nowrap ${activeTab==='needsReview' ? 'text-red-400 border-b-2 border-red-400' : 'text-gray-500 hover:text-gray-300'}`}>Needs Review / Rejected</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingSlips.filter(s => activeTab === 'pending' ? s.status === 0 : activeTab === 'verified' ? s.status === 1 : s.status === 2).map((slip) => (
                    <div key={slip.id} className={`bg-gray-800/50 border rounded-xl overflow-hidden transition-colors group flex flex-col ${bulkStatus?.currentSlipId === slip.id ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'border-gray-700 hover:border-gray-500'}`}>
                        <div className="h-48 bg-black/50 relative overflow-hidden flex items-center justify-center cursor-pointer" onClick={() => window.open(import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') + `/api/storage/documents/${slip.slip_image?.split(',')[0]}` : `/api/storage/documents/${slip.slip_image?.split(',')[0]}`, '_blank')}>
                            {slip.slip_image ? (
                                <img src={import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') + `/api/storage/documents/${slip.slip_image.split(',')[0]}` : `/api/storage/documents/${slip.slip_image.split(',')[0]}`} alt="slip" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={(e) => { e.target.src = '/logo.png'; }} />
                            ) : <Image size={40} className="text-gray-700" />}
                            <div className="absolute top-2 right-2 bg-black/70 backdrop-blur text-xs font-mono px-2 py-1 rounded text-white border border-gray-700">#{slip.id}</div>
                            
                            {/* Scanning Overlay if current */}
                            {bulkStatus?.isRunning && bulkStatus.currentSlipId === slip.id && (
                                <div className="absolute inset-0 bg-blue-900/20 z-10 flex flex-col items-center justify-center">
                                    <div className="w-full h-1 bg-blue-400 absolute top-0 left-0 animate-[scan_2s_linear_infinite]"></div>
                                    <Search size={32} className="text-blue-400 animate-ping opacity-50"/>
                                    <div className="bg-black/80 px-2 py-1 rounded text-[10px] text-blue-400 font-mono mt-2 border border-blue-500/50">ANALYZING...</div>
                                </div>
                            )}
                        </div>
                        
                        <div className="p-4 flex-1 flex flex-col">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-white text-lg">{slip.student?.firstName} {slip.student?.lastName}</h3>
                                <span className="text-emerald-400 font-bold bg-emerald-900/30 px-2 py-0.5 rounded text-sm whitespace-nowrap">LKR {slip.amount.toLocaleString()}</span>
                            </div>
                            <div className="text-xs text-gray-400 mb-4 font-mono">{new Date(slip.created_at).toLocaleString()}</div>
                            
                            <div className="mt-auto bg-gray-900/50 p-3 rounded-lg border border-gray-800 text-xs">
                                <div className="flex items-center gap-2 mb-1">
                                    <ShieldCheck size={14} className={slip.status === 1 ? 'text-emerald-400' : slip.status === 2 ? 'text-red-400' : 'text-gray-500'} /> 
                                    <span className="font-semibold text-gray-300">AI Analysis</span>
                                </div>
                                <div className={`font-mono leading-relaxed ${slip.status===1 ? 'text-emerald-300' : slip.status===2 ? 'text-red-300' : 'text-gray-400'}`}>
                                    {slip.remark || "Awaiting Verification..."}
                                </div>
                            </div>

                            {activeTab === 'pending' && !bulkStatus?.isRunning && (
                                <button onClick={() => verifySingleSlip(slip)} className="w-full mt-4 bg-gray-700 hover:bg-blue-600 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm">
                                    <Search size={16} /> Manual Review
                                </button>
                            )}
                        </div>
                    </div>
                ))}
                
                {pendingSlips.filter(s => activeTab === 'pending' ? s.status === 0 : activeTab === 'verified' ? s.status === 1 : s.status === 2).length === 0 && (
                    <div className="col-span-full py-16 text-center text-gray-500 bg-gray-800/20 rounded-xl border border-gray-800 border-dashed">
                        <FolderOpen size={48} className="mx-auto mb-4 text-gray-600 opacity-50" />
                        <p className="text-lg">No slips found in this category.</p>
                    </div>
                )}
            </div>
        </div>

"""

if ui_start != -1 and ui_end != -1:
    content = content[:ui_start] + new_ui + content[ui_end:]
    with open('/root/IMA-Campus/frontend/src/components/admin/AISlipVerification.jsx', 'w') as f:
        f.write(content)
    print("UI replaced successfully")
else:
    print("Could not find UI block to replace")

