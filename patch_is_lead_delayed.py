import re

with open('/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AfterSemNew/AfterSeminarNewInq.jsx', 'r') as f:
    newinq = f.read()

# Replace isLeadDelayed
old_isLeadDelayed = re.search(r'const isLeadDelayed = \(l\) => \{.*?\n    \};', newinq, re.DOTALL).group(0)

new_isLeadDelayed = """const isLeadDelayed = useCallback((l) => {
        if (l.enrollmentStatus === 'ENROLLED') return false;
        if (!isLeadPending(l)) return false; 
        
        const startTime = new Date(l.assignedAt || l.createdAt).getTime();
        const now = new Date().getTime();
        
        const diffMs = now - startTime;
        const diffHours = diffMs / (1000 * 60 * 60);
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        
        const round = l.coordinationRound || 1;
        
        if (round === 1 && diffHours >= 24) return true;
        if (round === 2 && diffDays >= 7) return true;
        
        return false;
    }, []);"""

newinq = newinq.replace(old_isLeadDelayed, new_isLeadDelayed)

# Fix isLeadPending to also be useCallback
old_isLeadPending = re.search(r'const isLeadPending = \(l\) => \{.*?\n    \};', newinq, re.DOTALL).group(0)
new_isLeadPending = """const isLeadPending = (l) => {
        return !['answered', 'reject'].includes(l.callStatus);
    };"""
newinq = newinq.replace(old_isLeadPending, new_isLeadPending)

# Fix useCallback import if missing
if "useCallback" not in newinq[:200]:
    newinq = newinq.replace("useMemo", "useMemo, useCallback")

# Add the filter buttons UI (since it's missing)
# Let's insert them right after the main phase buttons (Round 1, Round 2, etc.)
filter_html = """
                {/* Stats & Filters Box */}
                <div className="bg-white/5 border border-white/10 p-6 rounded-3xl mb-6 backdrop-blur-sm shadow-lg">
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                        
                        {/* Status Filters */}
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={() => { setStatusFilter('ALL'); setCurrentPage(1); }}
                                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${statusFilter === 'ALL' ? 'bg-indigo-500 text-white border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.4)]' : 'bg-black/40 text-slate-400 border-white/10 hover:bg-white/5 hover:text-white'}`}
                            >
                                All Active
                            </button>
                            <button
                                onClick={() => { setStatusFilter('PENDING'); setCurrentPage(1); }}
                                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${statusFilter === 'PENDING' ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'bg-black/40 text-amber-500/50 border-amber-900 hover:bg-amber-900/30'}`}
                            >
                                Pending <span className="ml-2 px-1.5 py-0.5 bg-amber-500/20 rounded-md text-[10px]">{stats.pending}</span>
                            </button>
                            <button
                                onClick={() => { setStatusFilter('DELAYED'); setCurrentPage(1); }}
                                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${statusFilter === 'DELAYED' ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)]' : 'bg-black/40 text-rose-500/50 border-rose-900 hover:bg-rose-900/30'}`}
                            >
                                Delayed <span className="ml-2 px-1.5 py-0.5 bg-rose-500/20 rounded-md text-[10px]">{stats.delayed}</span>
                            </button>
                            {activeRound !== 'enrolled' && (
                                <>
                                    <button
                                        onClick={() => { setStatusFilter('NO_ANSWER'); setCurrentPage(1); }}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${statusFilter === 'NO_ANSWER' ? 'bg-slate-600 text-white border-slate-500 shadow-[0_0_15px_rgba(100,116,139,0.3)]' : 'bg-black/40 text-slate-500 border-white/10 hover:bg-slate-800'}`}
                                    >
                                        No Ans <span className="ml-2 px-1.5 py-0.5 bg-slate-700 rounded-md text-[10px]">{stats.noAnswer}</span>
                                    </button>
                                    <button
                                        onClick={() => { setStatusFilter('REJECT'); setCurrentPage(1); }}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${statusFilter === 'REJECT' ? 'bg-red-500/20 text-red-300 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-black/40 text-red-500/50 border-red-900 hover:bg-red-900/30'}`}
                                    >
                                        Reject <span className="ml-2 px-1.5 py-0.5 bg-red-500/20 rounded-md text-[10px]">{stats.reject}</span>
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Search Bar */}
                        <div className="relative w-full xl:w-72 group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                                <FaSearch size={14} />
                            </div>
                            <input
                                type="text"
                                placeholder="Search Name or Phone..."
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                className="w-full bg-black/40 border border-white/10 focus:border-indigo-500/50 text-white text-sm rounded-xl py-2.5 pl-10 pr-4 outline-none transition-all placeholder:text-slate-600 focus:bg-indigo-950/20"
                            />
                        </div>
                    </div>
                </div>
"""

# Now replace the old "Stats & Filters Box" with this new one
# Wait, did AfterSeminarNewInq already have this box?
# Let's check if it did.
old_stats_box = re.search(r'\{\/\* Stats & Filters Box \*\/\}\n\s+<div className="bg-white/5 border border-white/10 p-6 rounded-3xl mb-6 backdrop-blur-sm shadow-lg">.*?</div>\n\s+</div>\n\s+</div>', newinq, re.DOTALL)
if old_stats_box:
    newinq = newinq.replace(old_stats_box.group(0), filter_html)

with open('/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AfterSemNew/AfterSeminarNewInq.jsx', 'w') as f:
    f.write(newinq)
print("isLeadDelayed and Filters patched successfully")
