import re

with open('/root/IMA-Campus/frontend/src/pages/delivery/components/PendingHolds.jsx', 'r') as f:
    content = f.read()

# 1. Add state variables
state_injection = """
    const [selectedBatchFilter, setSelectedBatchFilter] = useState('All');
    const [selectedGroupFilter, setSelectedGroupFilter] = useState('All');
"""
content = content.replace("const [activePayTab, setActivePayTab] = useState('All');", "const [activePayTab, setActivePayTab] = useState('All');" + state_injection)

# 2. Extract unique batches and groups (inside selectedBiz logic)
# We can do this right before `const filteredDeliveries = ...`
filter_prep = """
    const availableBatches = useMemo(() => {
        const batches = new Set(processedDeliveries.map(d => d.batchName).filter(Boolean));
        return ['All', ...Array.from(batches).sort()];
    }, [processedDeliveries]);

    const availableGroups = useMemo(() => {
        const groups = new Set(processedDeliveries.map(d => d.groupName).filter(Boolean));
        return ['All', ...Array.from(groups).sort()];
    }, [processedDeliveries]);
"""
content = content.replace("const filteredDeliveries = processedDeliveries.filter(order => {", filter_prep + "\n    const filteredDeliveries = processedDeliveries.filter(order => {")

# 3. Apply the filters in filteredDeliveries
filter_logic = """
        if (selectedBatchFilter !== 'All' && order.batchName !== selectedBatchFilter) return false;
        if (selectedGroupFilter !== 'All' && order.groupName !== selectedGroupFilter) return false;
"""
# Find where searchLower starts, which is inside `filteredDeliveries = processedDeliveries.filter(...)`
content = content.replace("const searchLower = searchQuery.toLowerCase();", filter_logic + "\n        const searchLower = searchQuery.toLowerCase();")


# 4. Render the dropdowns in the UI when selectedBiz is active.
# We'll put them right before the Tabs (All, Mixed, Monthly...)
dropdown_ui = """
                        <div className="flex flex-col sm:flex-row gap-3 mr-auto items-center bg-white/10 dark:bg-black/20 p-2 rounded-xl border border-white/20 shadow-inner">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Batch:</span>
                                <select 
                                    className="bg-white/80 dark:bg-black/40 text-gray-800 dark:text-gray-200 text-sm font-bold rounded-lg px-3 py-1.5 border border-gray-200 dark:border-white/10 focus:outline-none focus:border-brand-accent cursor-pointer"
                                    value={selectedBatchFilter}
                                    onChange={(e) => setSelectedBatchFilter(e.target.value)}
                                >
                                    {availableBatches.map(b => (
                                        <option key={b} value={b}>{b}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Month:</span>
                                <select 
                                    className="bg-white/80 dark:bg-black/40 text-gray-800 dark:text-gray-200 text-sm font-bold rounded-lg px-3 py-1.5 border border-gray-200 dark:border-white/10 focus:outline-none focus:border-brand-accent cursor-pointer"
                                    value={selectedGroupFilter}
                                    onChange={(e) => setSelectedGroupFilter(e.target.value)}
                                >
                                    {availableGroups.map(g => (
                                        <option key={g} value={g}>{g}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
"""
# Looking for the Tabs section inside selectedBiz:
# It's `<div className="flex items-center gap-2 bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl p-1.5 rounded-[1rem] border border-gray-200 dark:border-white/10 shadow-sm overflow-x-auto w-full sm:w-auto custom-scrollbar">`
# Let's add the dropdowns above it, or next to the Back button.
# Let's find the Back button:
# <button onClick={() => setSelectedBiz(null)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-slate-300 transition-colors w-max">
#     <ArrowLeft size={16}/> Back to Businesses
# </button>

# Let's place it in a flex container next to the Back button
back_button = """<button onClick={() => setSelectedBiz(null)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-slate-300 transition-colors w-max">
                            <ArrowLeft size={16}/> Back to Businesses
                        </button>"""
new_back_section = f"""<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
                        {back_button}
                        {dropdown_ui}
                        </div>
"""
content = content.replace(back_button, new_back_section)

# We must also reset these filters when selecting a business
# fetchDeliveriesForBiz
reset_filters = """
        setActivePayTab('All'); 
        setSelectedBatchFilter('All');
        setSelectedGroupFilter('All');
"""
content = content.replace("setActivePayTab('All');", reset_filters)

with open('/root/IMA-Campus/frontend/src/pages/delivery/components/PendingHolds.jsx', 'w') as f:
    f.write(content)
