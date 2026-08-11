import re

with open('/root/IMA-Campus/frontend/src/pages/delivery/components/DispatchDelivered.jsx', 'r') as f:
    content = f.read()

# 1. Add state variables
state_injection = """
    const [selectedBatchFilter, setSelectedBatchFilter] = useState('All');
    const [selectedGroupFilter, setSelectedGroupFilter] = useState('All');
"""
content = content.replace("const [selectedOrder, setSelectedOrder] = useState(null);", "const [selectedOrder, setSelectedOrder] = useState(null);" + state_injection)

# 2. Extract unique batches and groups (inside selectedBiz logic)
filter_prep = """
    const availableBatches = React.useMemo(() => {
        const batches = new Set(deliveries.map(d => d.batchName).filter(Boolean));
        return ['All', ...Array.from(batches).sort()];
    }, [deliveries]);

    const availableGroups = React.useMemo(() => {
        const groups = new Set(deliveries.map(d => d.groupName).filter(Boolean));
        return ['All', ...Array.from(groups).sort()];
    }, [deliveries]);
"""
content = content.replace("const filteredDeliveries = deliveries.filter(order => {", filter_prep + "\n    const filteredDeliveries = deliveries.filter(order => {")

# 3. Apply the filters in filteredDeliveries
filter_logic = """
        if (selectedBatchFilter !== 'All' && order.batchName !== selectedBatchFilter) return false;
        if (selectedGroupFilter !== 'All' && order.groupName !== selectedGroupFilter) return false;
"""
content = content.replace("const matchesSearch = order.studentName?.toLowerCase().includes", filter_logic + "\n        const matchesSearch = order.studentName?.toLowerCase().includes")


# 4. Render the dropdowns in the UI when selectedBiz is active.
dropdown_ui = """
                        <div className="flex flex-col sm:flex-row gap-3 items-center bg-white/10 dark:bg-black/20 p-2 rounded-xl border border-white/20 shadow-inner">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Batch:</span>
                                <select 
                                    className="bg-white/80 dark:bg-black/40 text-gray-800 dark:text-gray-200 text-sm font-bold rounded-lg px-3 py-1.5 border border-gray-200 dark:border-white/10 focus:outline-none focus:border-brand-accent cursor-pointer"
                                    value={selectedBatchFilter}
                                    onChange={(e) => {setSelectedBatchFilter(e.target.value); setCurrentPage(1);}}
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
                                    onChange={(e) => {setSelectedGroupFilter(e.target.value); setCurrentPage(1);}}
                                >
                                    {availableGroups.map(g => (
                                        <option key={g} value={g}>{g}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
"""
# Replace the Back to Businesses button with a flex container containing both the button and dropdowns
# Button in source is:
# <button onClick={() => {setSelectedBiz(null); setDeliveries([]);}} className="text-base font-bold text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white flex items-center gap-2 bg-white/80 dark:bg-white/[0.05] backdrop-blur-xl border border-gray-200 dark:border-white/10 px-6 py-3 rounded-2xl transition-all shrink-0 self-start lg:self-auto shadow-md hover:shadow-lg">
#     <ArrowLeft size={18}/> Back to Businesses
# </button>

# Let's do a regex substitution since the button spans multiple lines
button_pattern = r'<button onClick=\{\(\) => \{setSelectedBiz\(null\); setDeliveries\(\[\]\);\}\} className="text-base font-bold text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white flex items-center gap-2 bg-white/80 dark:bg-white/\[0\.05\] backdrop-blur-xl border border-gray-200 dark:border-white/10 px-6 py-3 rounded-2xl transition-all shrink-0 self-start lg:self-auto shadow-md hover:shadow-lg">\s*<ArrowLeft size=\{18\}/> Back to Businesses\s*</button>'
new_button = """<button onClick={() => {setSelectedBiz(null); setDeliveries([]);}} className="text-base font-bold text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white flex items-center gap-2 bg-white/80 dark:bg-white/[0.05] backdrop-blur-xl border border-gray-200 dark:border-white/10 px-6 py-3 rounded-2xl transition-all shrink-0 self-start lg:self-auto shadow-md hover:shadow-lg">
                            <ArrowLeft size={18}/> Back to Businesses
                        </button>"""
new_ui = f"""<div className="flex flex-col sm:flex-row justify-start items-start sm:items-center gap-4 w-full">
                            {new_button}
                            {dropdown_ui}
                        </div>"""

content = re.sub(button_pattern, new_ui, content)

# 5. Reset filters when fetching biz
reset_filters = """
        setSelectedBatchFilter('All');
        setSelectedGroupFilter('All');
        setCurrentPage(1);
"""
content = content.replace("setCurrentPage(1);", reset_filters)

with open('/root/IMA-Campus/frontend/src/pages/delivery/components/DispatchDelivered.jsx', 'w') as f:
    f.write(content)
