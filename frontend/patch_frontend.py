import re

with open('src/components/AfterSeminarCRM/CampaignStatsModules/PaidCampaignPerformance.jsx', 'r') as f:
    content = f.read()

# 1. Update State Variables
state_vars = """    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [searchQuery, setSearchQuery] = useState('');"""

new_state_vars = """    const [targetMonthName, setTargetMonthName] = useState('');
    const [monthlyGroups, setMonthlyGroups] = useState([]);
    const [overallEnrolledStats, setOverallEnrolledStats] = useState({ inCrmCount: 0, notInCrmCount: 0, notInCrmStudents: [] });
    const [searchQuery, setSearchQuery] = useState('');"""

content = content.replace(state_vars, new_state_vars)

# 2. Update useEffect dependencies
use_effect = """    useEffect(() => {
        fetchRetentionData();
    }, [filters?.selectedBusiness, filters?.selectedBatch, selectedMonth, startDate, endDate]);"""

new_use_effect = """    useEffect(() => {
        fetchRetentionData();
    }, [filters?.selectedBusiness, filters?.selectedBatch, targetMonthName, startDate, endDate]);"""

content = content.replace(use_effect, new_use_effect)

# 3. Update fetch params and state setting
fetch_data = """                params: { 
                    businessId: filters.selectedBusiness, 
                    batchId: filters.selectedBatch || 'ALL',
                    month: selectedMonth,
                    startDate: startDate || undefined,
                    endDate: endDate || undefined
                }
            });
            if (res.data) {
                setRawLeads(res.data.leads || []);
                setMonthStats({
                    prevMonthEnrolled: res.data.stats?.prevMonthEnrolled || 0,
                    thisMonthRenewed: res.data.stats?.thisMonthRenewed || 0,
                    thisMonthDropped: res.data.stats?.thisMonthDropped || 0
                });
            }"""

new_fetch_data = """                params: { 
                    businessId: filters.selectedBusiness, 
                    batchId: filters.selectedBatch || 'ALL',
                    targetMonthName: targetMonthName,
                    startDate: startDate || undefined,
                    endDate: endDate || undefined
                }
            });
            if (res.data) {
                setRawLeads(res.data.leads || []);
                setMonthlyGroups(res.data.monthlyGroups || []);
                setOverallEnrolledStats(res.data.overallEnrolledStats || { inCrmCount: 0, notInCrmCount: 0, notInCrmStudents: [] });
                if (!targetMonthName && res.data.defaultActiveGroupName) {
                    setTargetMonthName(res.data.defaultActiveGroupName);
                }
                setMonthStats({
                    prevMonthEnrolled: res.data.stats?.prevMonthEnrolled || 0,
                    thisMonthRenewed: res.data.stats?.thisMonthRenewed || 0,
                    thisMonthDropped: res.data.stats?.thisMonthDropped || 0
                });
            }"""

content = content.replace(fetch_data, new_fetch_data)

# 4. Add Export function for Not In CRM leads
export_func = """    const handleClearDates = () => {
        setStartDate('');
        setEndDate('');
    };"""

new_export_func = """    const handleClearDates = () => {
        setStartDate('');
        setEndDate('');
    };

    const exportNotInCrmLeads = () => {
        if (!overallEnrolledStats.notInCrmStudents || overallEnrolledStats.notInCrmStudents.length === 0) {
            return toast.error("No missing leads to export!");
        }
        const headers = ['Student ID', 'Name', 'Phone', 'WhatsApp'];
        const rows = overallEnrolledStats.notInCrmStudents.map(s => [
            s.id,
            (s.name || 'Unknown').replace(/,/g, ' '),
            s.phone || '',
            s.whatsapp || ''
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + "\\n" + rows.map(e => e.join(",")).join("\\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Not_In_CRM_Paid_Students.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`Exported ${overallEnrolledStats.notInCrmStudents.length} missing leads successfully!`);
    };"""

content = content.replace(export_func, new_export_func)

# 5. Filter rawLeads based on enrolledGroupIds and Target Month
metrics_calc = """    const metrics = useMemo(() => {
        const filtered = rawLeads.filter(l => 
            (l.phone || '').includes(searchQuery) || 
            (l.name && l.name.toLowerCase().includes(searchQuery.toLowerCase()))
        );"""

new_metrics_calc = """    const metrics = useMemo(() => {
        let currentTargetGroupIds = [];
        if (targetMonthName && monthlyGroups.length > 0) {
            const targetGroupObj = monthlyGroups.find(g => g.name === targetMonthName);
            if (targetGroupObj) {
                currentTargetGroupIds = targetGroupObj.ids;
            }
        }

        const filtered = rawLeads.filter(l => {
            const matchesSearch = (l.phone || '').includes(searchQuery) || (l.name && l.name.toLowerCase().includes(searchQuery.toLowerCase()));
            
            // If they are enrolled, they MUST have a payment matching the target active month (or full payment).
            // leadsWithGroupData from backend includes enrolledGroupIds.
            if (l.enrollmentStatus === 'ENROLLED' && currentTargetGroupIds.length > 0) {
                const matchesActiveGroup = l.enrolledGroupIds?.some(id => currentTargetGroupIds.includes(id));
                return matchesSearch && matchesActiveGroup;
            }
            
            return matchesSearch;
        });"""

content = content.replace(metrics_calc, new_metrics_calc)

# 6. Update Target Month Filter UI and add Overall Cards
ui_months = """            {/* 🔥 MONTH SELECTION & SEARCH 🔥 */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-[#1e293b] p-4 rounded-2xl border border-slate-700 shadow-md gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-lg"><FaCalendarAlt size={18}/></div>
                    <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Target Month Filter</h3>
                        <div className="mt-1">
                            <select 
                                value={selectedMonth} 
                                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                className="bg-[#0f172a] text-indigo-400 font-bold text-xs px-3 py-1.5 rounded-lg border border-indigo-500/30 outline-none focus:border-indigo-500 cursor-pointer"
                            >
                                {[...Array(12)].map((_, i) => (
                                    <option key={i+1} value={i+1}>Billing Month {i+1}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>"""

new_ui_months = """            {/* 🔥 NEW: OVERALL ENROLLED STATS (IN CRM VS NOT IN CRM) 🔥 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#1e293b] p-5 rounded-2xl border border-emerald-500/30 shadow-lg relative overflow-hidden flex flex-col justify-center">
                    <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl"></div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg"><FaCheckSquare size={16}/></div>
                        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider relative z-10">Total Enrolled (In CRM)</h3>
                    </div>
                    <h2 className="text-3xl font-black text-emerald-400 relative z-10 ml-11">{overallEnrolledStats.inCrmCount} <span className="text-sm font-semibold text-slate-500">Matching Students</span></h2>
                </div>
                <div className="bg-[#1e293b] p-5 rounded-2xl border border-amber-500/30 shadow-lg relative overflow-hidden flex flex-col justify-center">
                    <div className="absolute -right-4 -top-4 w-20 h-20 bg-amber-500/10 rounded-full blur-xl"></div>
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg"><FaRegSquare size={16}/></div>
                            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider relative z-10">Paid But Not In CRM</h3>
                        </div>
                        <button onClick={exportNotInCrmLeads} className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 border border-amber-500/30 relative z-10">
                            <FaFileExport /> Export List
                        </button>
                    </div>
                    <h2 className="text-3xl font-black text-amber-400 relative z-10 ml-11">{overallEnrolledStats.notInCrmCount} <span className="text-sm font-semibold text-slate-500">Missing Students</span></h2>
                </div>
            </div>

            {/* 🔥 MONTH SELECTION & SEARCH 🔥 */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-[#1e293b] p-4 rounded-2xl border border-slate-700 shadow-md gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-lg"><FaCalendarAlt size={18}/></div>
                    <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Target Month Filter</h3>
                        <div className="mt-1">
                            <select 
                                value={targetMonthName} 
                                onChange={(e) => setTargetMonthName(e.target.value)}
                                className="bg-[#0f172a] text-indigo-400 font-bold text-xs px-3 py-1.5 rounded-lg border border-indigo-500/30 outline-none focus:border-indigo-500 cursor-pointer"
                            >
                                <option value="">-- All Active Months --</option>
                                {monthlyGroups.map((g, i) => (
                                    <option key={i} value={g.name}>{g.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>"""

content = content.replace(ui_months, new_ui_months)

# 7. Update occurrences of M-{selectedMonth} in UI
content = content.replace("M-{selectedMonth - 1}", "Previous Target Month")
content = content.replace("M-{selectedMonth}", "Selected Target Month")
content = content.replace("Month {selectedMonth}", "Target Month")

with open('src/components/AfterSeminarCRM/CampaignStatsModules/PaidCampaignPerformance.jsx', 'w') as f:
    f.write(content)

print("FRONTEND PATCHED SUCCESSFULLY")
