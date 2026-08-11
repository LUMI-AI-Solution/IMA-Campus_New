import re

with open('/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AfterSemOpen/AfterSeminarOpenSem.jsx', 'r') as f:
    opensem = f.read()

with open('/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AfterSemOpen/AfterSeminarOpenSem.jsx', 'r') as f:
    opensem_lines = f.readlines()

with open('/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AfterSemNew/AfterSeminarNewInq.jsx', 'r') as f:
    newinq = f.read()

with open('/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AfterSemNew/AfterSeminarNewInq.jsx', 'r') as f:
    newinq_lines = f.readlines()

# Extract TILE and TABLE maps from OpenSem
tile_start = [i for i, line in enumerate(opensem_lines) if "viewMode === 'TILE' ?" in line][0]
table_start = [i for i, line in enumerate(opensem_lines) if "<div className=\"w-full overflow-x-auto bg" in line][0]
pagination_start = [i for i, line in enumerate(opensem_lines) if "{/* Pagination */}" in line][0]

tile_content = "".join(opensem_lines[tile_start+1:table_start-1])
table_content = "".join(opensem_lines[table_start:pagination_start-2])

# Replace 'paginatedLeads.map' with 'group.leads.map' inside both contents
tile_content = tile_content.replace('paginatedLeads.map', 'group.leads.map')
table_content = table_content.replace('paginatedLeads.map', 'group.leads.map')

# Create the full wrapper for newinq grid
new_leads_grid = f"""{{/* Main Leads Grid */}}
                    <div className="flex-1">
                        {{activeRound === 'r2' && groupedLeads[0] && (
                            <div className="bg-slate-900/40 rounded-2xl p-2 mb-6 border border-slate-700/50 flex flex-col md:flex-row items-center gap-4 justify-between">
                                <div className="relative px-5 flex items-center gap-4 w-full flex-wrap py-2">
                                    <button 
                                        onClick={{() => setR2Tab('ACTIVE')}}
                                        className={{`text-sm font-black uppercase tracking-widest px-5 py-2 rounded-xl transition-all border ${{r2Tab === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-black/20 text-emerald-500/50 border-emerald-900 hover:bg-emerald-900/30'}}`}}
                                    >
                                        <span className="opacity-70 text-xs mr-2">ACTIVE</span> {{groupedLeads[0].activeCount}} 
                                    </button>
                                    <button 
                                        onClick={{() => setR2Tab('DELAYED')}}
                                        className={{`text-sm font-black uppercase tracking-widest px-5 py-2 rounded-xl transition-all border ${{r2Tab === 'DELAYED' ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)]' : 'bg-black/20 text-rose-500/50 border-rose-900 hover:bg-rose-900/30'}}`}}
                                    >
                                        <span className="opacity-70 text-xs mr-2">DELAYED</span> {{groupedLeads[0].delayedCount}}
                                    </button>
                                    <div className="ml-auto text-xs font-bold text-slate-400 bg-[#0F172A] px-4 py-2 rounded-xl border border-white/10 shadow-inner">
                                        Total: <span className="text-white ml-1">{{groupedLeads[0].total}}</span> Leads
                                    </div>
                                </div>
                            </div>
                        )}}
                        {{paginatedLeads.length === 0 ? (
                            <div className="text-center py-20 bg-white/5 border border-white/10 rounded-3xl shadow-lg">
                                <PhoneCall className="text-slate-600 mx-auto mb-4" size={{48}} />
                                <h3 className="text-xl font-bold text-slate-400">No Leads Found</h3>
                                <p className="text-slate-500 mt-2">There are no leads matching your current filters.</p>
                            </div>
                        ) : (
                            <div className="space-y-8 pb-10">
                                {{groupedLeads.map((group, gIdx) => (
                                    <div key={{gIdx}} className="space-y-4">
                                        {{activeRound === 'r1' && (
                                            <div className="sticky top-0 z-10 py-2 backdrop-blur-sm mb-4">
                                                <div className="flex justify-between items-center relative py-2.5">
                                                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-transparent border-l-4 border-emerald-500 rounded-r-2xl shadow-sm"></div>
                                                    <div className="relative px-5 flex items-center gap-2">
                                                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-emerald-400 drop-shadow-md">
                                                            {{group.label}}
                                                        </h3>
                                                    </div>
                                                    <div className="relative px-5">
                                                        <div className="text-xs font-bold text-emerald-200 bg-emerald-500/20 px-4 py-1 rounded-full border border-emerald-500/30 shadow-inner">
                                                            {{group.leads.length}} Leads
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}}
                                        
                                        {{viewMode === 'TILE' ? (
{tile_content}                                        ) : (
{table_content}                                        )}}
                                    </div>
                                ))}}
                            </div>
                        )}}
                    </div>
"""

newinq_grid = re.search(r'\{/\* Main Leads Grid \*/\}(.*?)\{/\* Pagination \*/\}', newinq, re.DOTALL).group(0)
newinq = newinq.replace(newinq_grid, new_leads_grid + '\n\n                        {/* Pagination */}')

# Now write back to file
with open('/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AfterSemNew/AfterSeminarNewInq.jsx', 'w') as f:
    f.write(newinq)
print("Patch 3 applied successfully.")
