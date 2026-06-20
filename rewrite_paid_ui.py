import re

with open('/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CampaignStatsModules/PaidCampaignPerformance.jsx', 'r') as f:
    content = f.read()

# We want to replace everything from `return (` onwards.
# But first, we ensure we have all required icons.
icon_line_pattern = r"import { .* } from 'react-icons/fa';"
# Let's replace the icon line directly.
new_icon_line = "import { FaUsers, FaUserTie, FaPhoneVolume, FaChartBar, FaMoneyCheckAlt, FaExclamationCircle, FaSearch, FaCalendarAlt, FaCheckCircle, FaTimesCircle, FaChevronDown, FaChevronUp, FaFileExport, FaTimes, FaCheckSquare, FaRegSquare, FaExclamationTriangle } from 'react-icons/fa';"
content = re.sub(icon_line_pattern, new_icon_line, content)

# Now find the first occurrence of `const PIE_COLORS` which is just before `return (`
split_str = "    const PIE_COLORS = ['#10b981', '#ef4444'];"
parts = content.split(split_str)
top_half = parts[0]

new_ui = """    const PIE_COLORS = ['#10b981', '#ef4444'];
    const pieData = [
        { name: 'Enrolled', value: metrics.totalEnrolled },
        { name: 'Dropped (Non-Enrolled)', value: metrics.totalNonEnrolled }
    ];

    return (
        <div className="flex flex-col gap-6 font-sans text-slate-200 animate-fade-in p-2 rounded-lg bg-transparent relative">
            
            {/* 🔥 DATE FILTERS ROW & MAIN EXPORT BUTTON 🔥 */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-white/5 backdrop-blur-xl p-5 rounded-2xl border border-white/10 shadow-xl gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-lg"><FaCalendarAlt size={18} /></div>
                    <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Campaign Stats Filter</h3>
                        <p className="text-[10px] text-slate-400">Filter by specific dates or view today's performance</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    <button onClick={handleDailyClick} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-md transition-all">Today (Daily)</button>
                    <div className="flex items-center gap-2 bg-black/40 border border-white/10 p-1.5 rounded-lg">
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-slate-300 text-xs font-semibold outline-none px-2 cursor-pointer" style={{ colorScheme: 'dark' }} />
                        <span className="text-slate-500 text-xs">to</span>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-slate-300 text-xs font-semibold outline-none px-2 cursor-pointer" style={{ colorScheme: 'dark' }} />
                    </div>
                    {(startDate || endDate) && <button onClick={handleClearDates} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase tracking-wider rounded-lg transition-all">Clear</button>}

                    <div className="w-px h-6 bg-white/10 mx-2 hidden md:block"></div>

                    {/* MASTER EXPORT BUTTON */}
                    <button onClick={() => setShowExportModal(true)} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-md transition-all flex items-center gap-2">
                        <FaFileExport size={12} /> Advanced Export
                    </button>
                </div>
            </div>

            {/* 🔥 NEW: OVERALL ENROLLED STATS (IN CRM VS NOT IN CRM) 🔥 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/5 backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-xl flex flex-col justify-center relative overflow-hidden transition-all">
                    <div className="absolute -right-6 -top-6 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl"></div>
                    <div className="flex items-center gap-3 mb-2 relative z-10">
                        <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg"><FaCheckSquare size={16}/></div>
                        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Total Enrolled (In CRM)</h3>
                    </div>
                    <h2 className="text-3xl font-black text-emerald-400 relative z-10 ml-11">{overallEnrolledStats.inCrmCount} <span className="text-[10px] font-semibold text-emerald-500/50 uppercase tracking-widest">Matching Students</span></h2>
                </div>
                <div className="bg-amber-500/5 backdrop-blur-md p-5 rounded-2xl border border-amber-500/20 shadow-xl flex flex-col justify-center relative overflow-hidden transition-all">
                    <div className="absolute -right-6 -top-6 w-20 h-20 bg-amber-500/10 rounded-full blur-2xl"></div>
                    <div className="flex justify-between items-start relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg"><FaRegSquare size={16}/></div>
                            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Paid But Not In CRM</h3>
                        </div>
                        <button onClick={exportNotInCrmLeads} className="bg-white/5 hover:bg-amber-500/20 text-amber-400 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors flex items-center gap-2 border border-white/10 hover:border-amber-500/30 uppercase tracking-widest shadow-sm">
                            <FaFileExport /> Export List
                        </button>
                    </div>
                    <h2 className="text-3xl font-black text-amber-400 relative z-10 ml-11">{overallEnrolledStats.notInCrmCount} <span className="text-[10px] font-semibold text-amber-500/50 uppercase tracking-widest">Missing Students</span></h2>
                </div>
            </div>

            {/* 🔥 MONTH SELECTION & SEARCH 🔥 */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-white/5 backdrop-blur-xl p-5 rounded-2xl border border-white/10 shadow-xl gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-fuchsia-500/10 text-fuchsia-400 rounded-lg"><FaCalendarAlt size={18}/></div>
                    <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Target Month Filter</h3>
                        <div className="mt-2">
                            <select 
                                value={targetMonthName} 
                                onChange={(e) => setTargetMonthName(e.target.value)}
                                className="bg-black/40 text-fuchsia-400 font-bold text-xs px-3 py-2 rounded-lg border border-white/10 outline-none focus:border-fuchsia-500 cursor-pointer shadow-inner"
                            >
                                <option value="">-- All Active Months --</option>
                                {monthlyGroups.map((g, i) => (
                                    <option key={i} value={g.name}>{g.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
                
                <div className="relative w-full md:w-80">
                    <FaSearch className="absolute left-4 top-3.5 text-slate-500 text-sm" />
                    <input 
                        type="text" 
                        placeholder="Search student number or name..." 
                        value={searchQuery} 
                        onChange={(e) => setSearchQuery(e.target.value)} 
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-xs font-semibold text-white outline-none focus:border-indigo-500 transition-all shadow-inner" 
                    />
                </div>
            </div>

            {/* 🔥 MONTH COMPARISON CARDS (M-1 vs M) 🔥 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/5 backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-xl flex flex-col justify-center transition-all">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-500"></div> Previous Target Month
                    </p>
                    <h2 className="text-3xl font-black text-white">{monthStats.prevMonthEnrolled} <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Students</span></h2>
                </div>
                <div className="bg-emerald-500/5 backdrop-blur-md p-5 rounded-2xl border border-emerald-500/20 shadow-xl flex flex-col justify-center relative overflow-hidden transition-all">
                    <div className="absolute -right-6 -top-6 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl"></div>
                    <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-2 relative z-10 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Selected Month Renewed
                    </p>
                    <h2 className="text-3xl font-black text-emerald-400 relative z-10">{monthStats.thisMonthRenewed} <span className="text-[10px] font-semibold text-emerald-500/50 uppercase tracking-widest">Students</span></h2>
                </div>
                <div className="bg-red-500/5 backdrop-blur-md p-5 rounded-2xl border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)] flex flex-col justify-center relative overflow-hidden transition-all">
                    <div className="absolute -right-4 -top-4 w-20 h-20 bg-red-500/10 rounded-full blur-xl animate-pulse"></div>
                    <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest mb-2 relative z-10 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div> Selected Month Dropped
                    </p>
                    <h2 className="text-3xl font-black text-red-500 relative z-10">{monthStats.thisMonthDropped} <span className="text-[10px] font-semibold text-red-500/50 uppercase tracking-widest">Students</span></h2>
                </div>
            </div>

            {/* 🔥 DEEP BREAKDOWN CARDS (ENROLLED VS NON-ENROLLED) 🔥 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* ENROLLED BREAKDOWN */}
                <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-emerald-500/20 shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex flex-col relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-500">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-colors duration-700 pointer-events-none"></div>
                    <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-emerald-500/20 rounded-xl"><FaCheckCircle className="text-emerald-400 text-xl"/></div>
                            <h3 className="text-emerald-400 font-black text-sm uppercase tracking-widest">Enrolled</h3>
                        </div>
                        <h2 className="text-4xl font-black text-emerald-400 drop-shadow-md">{metrics.totalEnrolled}</h2>
                    </div>
                    <div className="grid grid-cols-3 gap-4 relative z-10">
                        <div className="bg-black/40 p-4 rounded-2xl border border-white/5 text-center hover:border-indigo-500/30 transition-all group-hover:bg-black/50">
                            <p className="text-[9px] text-indigo-400 font-black uppercase tracking-widest mb-2">Full Pay</p>
                            <h4 className="text-2xl font-bold text-white">{metrics.enrolledFull}</h4>
                        </div>
                        <div className="bg-black/40 p-4 rounded-2xl border border-white/5 text-center hover:border-blue-500/30 transition-all group-hover:bg-black/50">
                            <p className="text-[9px] text-blue-400 font-black uppercase tracking-widest mb-2">Monthly</p>
                            <h4 className="text-2xl font-bold text-white">{metrics.enrolledMonthly}</h4>
                        </div>
                        <div className="bg-black/40 p-4 rounded-2xl border border-white/5 text-center hover:border-amber-500/30 transition-all group-hover:bg-black/50">
                            <p className="text-[9px] text-amber-400 font-black uppercase tracking-widest mb-2">Installment</p>
                            <h4 className="text-2xl font-bold text-white">{metrics.enrolledInstall}</h4>
                        </div>
                    </div>
                </div>

                {/* NON-ENROLLED BREAKDOWN */}
                <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-red-500/20 shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex flex-col relative overflow-hidden group hover:border-red-500/30 transition-all duration-500">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl group-hover:bg-red-500/10 transition-colors duration-700 pointer-events-none"></div>
                    <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-red-500/20 rounded-xl"><FaTimesCircle className="text-red-400 text-xl"/></div>
                            <h3 className="text-red-400 font-black text-sm uppercase tracking-widest">Non-Enrolled</h3>
                        </div>
                        <h2 className="text-4xl font-black text-red-500 drop-shadow-md">{metrics.totalNonEnrolled}</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-4 relative z-10">
                        <div className="bg-black/40 p-4 rounded-2xl border border-white/5 text-center hover:border-blue-500/30 transition-all group-hover:bg-black/50">
                            <p className="text-[9px] text-blue-400 font-black uppercase tracking-widest mb-2">Dropped Monthly</p>
                            <h4 className="text-2xl font-bold text-white">{metrics.nonEnrolledMonthly}</h4>
                        </div>
                        <div className="bg-black/40 p-4 rounded-2xl border border-white/5 text-center hover:border-amber-500/30 transition-all group-hover:bg-black/50">
                            <p className="text-[9px] text-amber-400 font-black uppercase tracking-widest mb-2">Dropped Installment</p>
                            <h4 className="text-2xl font-bold text-white">{metrics.nonEnrolledInstall}</h4>
                        </div>
                    </div>
                </div>
            </div>

            {/* 🔥 DETAILS ROW (CHART & TABLE) 🔥 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* CHART */}
                <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-indigo-500/10 shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex flex-col relative overflow-hidden group hover:border-indigo-500/20 transition-all duration-500">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors duration-700 pointer-events-none"></div>
                    <h3 className="text-xs font-semibold text-slate-300 mb-6 uppercase tracking-widest flex items-center gap-2"><FaChartBar className="text-indigo-400"/> Staff Conversion Chart</h3>
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-[350px] max-h-[500px]">
                        {metrics.staffBreakdown.length === 0 ? <div className="flex h-full items-center justify-center text-slate-500 text-sm">No data available.</div> : (
                            <div style={{ height: `${Math.max(metrics.staffBreakdown.length * 60, 300)}px` }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={metrics.staffBreakdown} layout="vertical" margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                        <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                        <YAxis type="category" dataKey="name" stroke="#cbd5e1" fontSize={11} tickLine={false} axisLine={false} width={130} fontWeight="bold" />
                                        <RechartsTooltip cursor={{ fill: '#4f46e520' }} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '16px', fontSize: '12px', color: '#fff', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }} />
                                        <Legend verticalAlign="top" wrapperStyle={{ fontSize: '11px', paddingBottom: '15px' }} iconType="circle" />
                                        <Bar dataKey="contacted" name="Covered" fill="url(#colorCovered)" radius={[0, 6, 6, 0]} barSize={14} />
                                        <Bar dataKey="pending" name="Pending" fill="url(#colorPending)" radius={[0, 6, 6, 0]} barSize={14} />
                                        <Bar dataKey="enrolled" name="Enrolled" fill="url(#colorEnrolled)" radius={[0, 6, 6, 0]} barSize={14} />
                                        <defs>
                                            <linearGradient id="colorCovered" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.8}/>
                                                <stop offset="100%" stopColor="#818cf8" stopOpacity={1}/>
                                            </linearGradient>
                                            <linearGradient id="colorPending" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor="#e11d48" stopOpacity={0.8}/>
                                                <stop offset="100%" stopColor="#fb7185" stopOpacity={1}/>
                                            </linearGradient>
                                            <linearGradient id="colorEnrolled" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor="#059669" stopOpacity={0.8}/>
                                                <stop offset="100%" stopColor="#34d399" stopOpacity={1}/>
                                            </linearGradient>
                                        </defs>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>

                {/* ADVANCED STAFF BREAKDOWN TABLE */}
                <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-xl lg:col-span-2 flex flex-col relative overflow-hidden">
                    <div className="flex justify-between items-center mb-6 relative z-10">
                        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest flex items-center gap-3">
                            <div className="p-2 bg-indigo-500/20 rounded-lg shadow-inner border border-indigo-500/20"><FaUserTie className="text-indigo-400"/></div>
                            Coordinator Conversion (Target Month)
                        </h3>
                    </div>

                    <div className="flex-1 overflow-x-auto custom-scrollbar">
                        {metrics.staffBreakdown.length === 0 ? <div className="text-center py-10 text-slate-500 text-sm">No coordinator data available.</div> : (
                            <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
                                <thead className="text-slate-400 text-[10px] uppercase tracking-wider bg-black/40">
                                    <tr>
                                        <th className="py-4 px-3 font-semibold rounded-tl-lg">Coordinator</th>
                                        <th className="py-4 px-2 text-center font-semibold">Assigned</th>
                                        <th className="py-4 px-2 text-center font-semibold text-blue-400">Covered</th>
                                        <th className="py-4 px-2 text-center font-semibold text-slate-400">Pending</th>
                                        <th className="py-4 px-2 text-center font-semibold text-emerald-400">Enrolled (Won)</th>
                                        <th className="py-4 px-3 text-right font-semibold rounded-tr-lg">Conversion</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {metrics.staffBreakdown.map((staff, idx) => {
                                        const isExpanded = expandedRows[staff.name];
                                        const rate = staff.assigned > 0 ? Math.round((staff.enrolled / staff.assigned) * 100) : 0;

                                        return (
                                            <React.Fragment key={idx}>
                                                <tr onClick={() => toggleRow(staff.name)} className={`cursor-pointer transition-colors border-b border-white/5 ${isExpanded ? 'bg-white/10' : 'hover:bg-white/5'}`}>
                                                    <td className="py-3 px-3 font-medium text-slate-200 flex items-center gap-2">
                                                        {isExpanded ? <FaChevronUp size={10} className="text-indigo-400" /> : <FaChevronDown size={10} className="text-slate-500" />}
                                                        <div className="flex items-center gap-2">
                                                            {staff.name} <BusinessBadge businessType={staff.businessType} role={staff.role} />
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-2 text-center text-slate-300">{staff.assigned}</td>
                                                    <td className="py-3 px-2 text-center font-semibold text-blue-400">{staff.contacted}</td>
                                                    <td className="py-3 px-2 text-center font-semibold text-slate-400">{staff.pending}</td>
                                                    <td className="py-3 px-2 text-center font-semibold text-emerald-400">{staff.enrolled}</td>
                                                    <td className="py-3 px-3 text-right font-bold text-slate-300">
                                                        <span className={`px-2 py-1 rounded-md text-[10px] ${rate > 75 ? 'bg-emerald-500/20 text-emerald-400' : rate > 40 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>{rate}%</span>
                                                    </td>
                                                </tr>

                                                {isExpanded && (
                                                    <tr className="bg-black/40 border-b border-indigo-500/20 relative overflow-hidden">
                                                        <td colSpan="6" className="p-5">
                                                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-transparent to-transparent pointer-events-none"></div>
                                                            <div className="space-y-6 relative z-10">
                                                                
                                                                {/* Plan type section */}
                                                                <div>
                                                                    <h4 className="text-[11px] font-black text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                                        <FaChartBar size={14}/> Payment Plan Progress (Full, Monthly, Installment)
                                                                    </h4>
                                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                                        {Object.entries(staff.plans).map(([planName, stats]) => {
                                                                            let title = planName === 'FULL' ? 'FULL PAYMENT' : planName === 'MONTHLY' ? 'MONTHLY PLAN' : planName === 'INSTALLMENT' ? 'INSTALLMENT' : 'NON ENROLLED';
                                                                            let bgGradient = planName === 'FULL' ? 'from-emerald-500/10 to-transparent' : planName === 'MONTHLY' ? 'from-blue-500/10 to-transparent' : planName === 'INSTALLMENT' ? 'from-amber-500/10 to-transparent' : 'from-slate-600/10 to-transparent';
                                                                            let borderColor = planName === 'FULL' ? 'border-emerald-500/20' : planName === 'MONTHLY' ? 'border-blue-500/20' : planName === 'INSTALLMENT' ? 'border-amber-500/20' : 'border-slate-500/20';
                                                                            let iconColor = planName === 'FULL' ? 'text-emerald-400' : planName === 'MONTHLY' ? 'text-blue-400' : planName === 'INSTALLMENT' ? 'text-amber-400' : 'text-slate-400';

                                                                            return (
                                                                                <div key={planName} className={`bg-gradient-to-br ${bgGradient} border ${borderColor} rounded-2xl p-4 flex flex-col gap-3 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden group`}>
                                                                                    <div className={`absolute top-0 right-0 w-16 h-16 bg-current opacity-5 rounded-bl-full pointer-events-none ${iconColor}`}></div>
                                                                                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                                                                        <span className={`text-[10px] font-black uppercase tracking-widest ${iconColor}`}>{title}</span>
                                                                                        <span className="text-[9px] bg-white/10 px-2 py-0.5 rounded font-black text-white">{stats.assigned}</span>
                                                                                    </div>
                                                                                    <div className="space-y-2 mt-1">
                                                                                        <div className="flex justify-between items-center text-xs"><span className="text-slate-400 font-medium">Covered</span><span className={`${iconColor} font-black`}>{stats.contacted}</span></div>
                                                                                        <div className="flex justify-between items-center text-xs"><span className="text-slate-400 font-medium">Pending</span><span className="text-slate-300 font-black">{stats.pending}</span></div>
                                                                                        <div className="flex justify-between items-center text-xs border-t border-white/5 pt-1.5"><span className="text-indigo-400 font-bold">Enrolled</span><span className="text-indigo-400 font-black">{stats.enrolled}</span></div>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>

                                                                {/* Phase Toggles row */}
                                                                <div className="border-t border-white/5 pt-5">
                                                                    <h4 className="text-[11px] font-black text-fuchsia-400 uppercase tracking-widest mb-3 flex items-center justify-between">
                                                                        <span className="flex items-center gap-2"><FaExclamationCircle size={14}/> Call Phases</span>
                                                                        <button 
                                                                            onClick={(e) => { e.stopPropagation(); exportStaffRoundData(staff.name, 'Overall Active', staff.leads); }} 
                                                                            className="bg-white/5 hover:bg-indigo-500 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm border border-transparent hover:border-white/10"
                                                                            title={`Export ${staff.name} Leads`}
                                                                        >
                                                                            <FaFileExport size={10} /> Export Leads ({staff.leads.length})
                                                                        </button>
                                                                    </h4>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                                        {Object.entries(staff.phases).map(([phaseNum, stats]) => (
                                                                            <div key={phaseNum} className="bg-gradient-to-br from-fuchsia-500/10 to-transparent border border-fuchsia-500/20 rounded-2xl p-4 flex flex-col gap-3 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden group">
                                                                                <div className="absolute top-0 right-0 w-16 h-16 bg-fuchsia-500 opacity-5 rounded-bl-full pointer-events-none"></div>
                                                                                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                                                                    <span className="text-[10px] font-black uppercase tracking-widest text-fuchsia-400">PHASE 0{phaseNum}</span>
                                                                                    <span className="text-[9px] bg-white/10 px-2 py-0.5 rounded font-black text-white">{stats.assigned}</span>
                                                                                </div>
                                                                                <div className="space-y-2 mt-1">
                                                                                    <div className="flex justify-between items-center text-xs"><span className="text-slate-400 font-medium">Covered</span><span className="text-fuchsia-400 font-black">{stats.contacted}</span></div>
                                                                                    <div className="flex justify-between items-center text-xs"><span className="text-slate-400 font-medium">Pending</span><span className="text-slate-300 font-black">{stats.pending}</span></div>
                                                                                </div>
                                                                                <div className="w-full bg-black/40 rounded-full h-1 mt-2 overflow-hidden">
                                                                                    <div className="h-1 rounded-full bg-fuchsia-500 shadow-[0_0_8px_#d946ef]" style={{ width: `${stats.assigned > 0 ? (stats.contacted / stats.assigned) * 100 : 0}%` }}></div>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {/* 🔥 ADVANCED EXPORT MODAL 🔥 */}
            {showExportModal && (
                <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in text-slate-200">
                    <div className="bg-[#0b111a] border border-white/10 rounded-2xl w-full max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden">
                        
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                            <div>
                                <h2 className="text-lg font-bold text-white flex items-center gap-2"><FaFileExport className="text-emerald-500"/> Advanced Export Leads</h2>
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Export Paid Campaign Data to Excel (CSV)</p>
                            </div>
                            <button onClick={() => setShowExportModal(false)} className="text-slate-500 hover:text-white bg-black/40 p-2 rounded-lg transition-colors border border-transparent hover:border-white/10"><FaTimes size={14}/></button>
                        </div>

                        {/* Body */}
                        <div className="p-6 flex flex-col gap-5">
                            {/* Mode Selection */}
                            <div className="flex flex-col gap-2">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Select Export Scope</label>
                                <div className="flex flex-col gap-2">
                                    <button onClick={() => setExportMode('ALL')} className={`p-3 rounded-xl border text-left transition-all ${exportMode === 'ALL' ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-inner' : 'bg-black/20 border-white/5 text-slate-400 hover:bg-white/5'}`}>
                                        <h4 className="font-bold text-sm text-white mb-0.5">All Data (Overall)</h4>
                                        <p className="text-xs opacity-70">Export all Paid Campaign leads across all staff members.</p>
                                    </button>
                                    <button onClick={() => setExportMode('SINGLE')} className={`p-3 rounded-xl border text-left transition-all ${exportMode === 'SINGLE' ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-inner' : 'bg-black/20 border-white/5 text-slate-400 hover:bg-white/5'}`}>
                                        <h4 className="font-bold text-sm text-white mb-0.5">Single Coordinator</h4>
                                        <p className="text-xs opacity-70">Select one specific coordinator and export their leads.</p>
                                    </button>
                                    <button onClick={() => setExportMode('MULTIPLE')} className={`p-3 rounded-xl border text-left transition-all ${exportMode === 'MULTIPLE' ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-inner' : 'bg-black/20 border-white/5 text-slate-400 hover:bg-white/5'}`}>
                                        <h4 className="font-bold text-sm text-white mb-0.5">Multiple Coordinators</h4>
                                        <p className="text-xs opacity-70">Select multiple staff members to export their combined leads.</p>
                                    </button>
                                </div>
                            </div>

                            {/* Dynamic Options based on selection */}
                            <div className="min-h-[120px]">
                                {exportMode === 'ALL' && (
                                    <div className="flex h-full items-center justify-center p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                        <p className="text-sm font-bold text-emerald-400 text-center">Ready to export all coordinator leads.</p>
                                    </div>
                                )}
                                
                                {exportMode === 'SINGLE' && (
                                    <div className="flex flex-col gap-2 animate-fade-in">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Select Coordinator</label>
                                        <select value={selectedSingleStaff} onChange={(e) => setSelectedSingleStaff(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm font-semibold text-white outline-none focus:border-indigo-500 cursor-pointer">
                                            <option value="">-- Choose Staff --</option>
                                            {metrics.staffBreakdown.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                                        </select>
                                    </div>
                                )}

                                {exportMode === 'MULTIPLE' && (
                                    <div className="flex flex-col gap-2 animate-fade-in">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Select Coordinators (Tick)</label>
                                        <div className="flex flex-col gap-1 max-h-[150px] overflow-y-auto custom-scrollbar pr-2 p-2 bg-black/20 border border-white/5 rounded-xl">
                                            {metrics.staffBreakdown.map(s => {
                                                const isSelected = selectedMultipleStaff.includes(s.name);
                                                return (
                                                    <div key={s.name} onClick={() => handleMultiSelectToggle(s.name)} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors border ${isSelected ? 'bg-indigo-600/20 border-indigo-500/30' : 'hover:bg-white/5 border-transparent'}`}>
                                                        {isSelected ? <FaCheckSquare className="text-indigo-400" size={16}/> : <FaRegSquare className="text-slate-600" size={16}/>}
                                                        <span className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-slate-400'}`}>{s.name}</span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                        <p className="text-xs text-indigo-400 font-bold mt-1 text-right">{selectedMultipleStaff.length} selected</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer / Actions */}
                        <div className="px-6 py-4 border-t border-white/5 bg-black/20 flex gap-3">
                            <button onClick={() => setShowExportModal(false)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold uppercase tracking-wider rounded-xl transition-all border border-white/10">Cancel</button>
                            <button onClick={handleExecuteExport} className="flex-[2] py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg transition-transform hover:scale-[1.02] flex items-center justify-center gap-2">
                                <FaFileExport size={14}/> Generate Excel
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}
"""

with open('/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CampaignStatsModules/PaidCampaignPerformance.jsx', 'w') as f:
    f.write(top_half + new_ui)

