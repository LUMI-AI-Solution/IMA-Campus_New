import React, { useState, useMemo } from 'react';
import { FaFilter, FaSearch, FaChartPie, FaCheckCircle, FaClock, FaExclamationTriangle, FaTimes, FaUserGraduate, FaSyncAlt } from 'react-icons/fa';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import toast from 'react-hot-toast';
import LeadCard from './LeadCard';

const getShiftData = (dateString) => {
    if (!dateString) return { dateStr: 'Unknown', label: 'Unknown Date', timestamp: 0 };
    
    const d = new Date(dateString);
    const shiftDate = new Date(d);
    
    if (d.getHours() < 8) {
        shiftDate.setDate(shiftDate.getDate() - 1);
    }
    
    shiftDate.setHours(0, 0, 0, 0);
    
    const now = new Date();
    const todayShift = new Date(now);
    if (now.getHours() < 8) todayShift.setDate(todayShift.getDate() - 1);
    todayShift.setHours(0, 0, 0, 0);
    
    const yesterdayShift = new Date(todayShift);
    yesterdayShift.setDate(yesterdayShift.getDate() - 1);
    
    if (shiftDate.getTime() === todayShift.getTime()) {
        return { label: 'Today', timestamp: shiftDate.getTime() };
    } else if (shiftDate.getTime() === yesterdayShift.getTime()) {
        return { label: 'Yesterday', timestamp: shiftDate.getTime() };
    } else {
        return { label: shiftDate.toLocaleDateString('en-CA'), timestamp: shiftDate.getTime() };
    }
};

export default function AfterSeminarOpenSem({ leads, allBatches, filters, drafts, setDrafts, handleUpdateLocalLead, handleSaveCallData, setChatModalLead, isManager, handleTempUnlock, externalSearch }) {
    
    const [activeRound, setActiveRound] = useState('r1'); 
    const [activePhase, setActivePhase] = useState(1); 
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [showOnlyDelayed, setShowOnlyDelayed] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isStatsOpen, setIsStatsOpen] = useState(false);
    const [displayLimit, setDisplayLimit] = useState(36);
    const [typingMode, setTypingMode] = useState('en');

    const openSemLeads = Array.isArray(leads) ? leads.filter(l => l?.inquiryType === 'OPEN_SEMINAR' || l?.inquiryType === 'NORMAL') : [];

    const checkIsLate = (lead) => {
        if (!lead) return false;
        const startTime = lead.updatedAt || lead.createdAt;
        if (!startTime) return false;

        const diffMs = new Date().getTime() - new Date(startTime).getTime();
        const msRemaining = (120 * 60 * 60 * 1000) - diffMs; 
        const isPending = !lead.callStatus || lead.callStatus === 'pending';

        return isPending && msRemaining < 0;
    };

    const getTimerDataText = (lead) => {
        if (!lead) return null;
        const startTime = lead.updatedAt || lead.createdAt;
        if (!startTime) return null;

        const diffMs = new Date().getTime() - new Date(startTime).getTime();
        const msRemaining = (120 * 60 * 60 * 1000) - diffMs;
        const isPending = !lead.callStatus || lead.callStatus === 'pending';

        if (isPending) {
            if (msRemaining < 0) {
                const lateMs = Math.abs(msRemaining);
                const days = Math.floor(lateMs / (1000 * 60 * 60 * 24));
                const hrs = Math.floor((lateMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                return { text: days > 0 ? `-${days}d ${hrs}h LATE` : `-${hrs}h LATE`, type: "danger", isLate: true };
            } else {
                const days = Math.floor(msRemaining / (1000 * 60 * 60 * 24));
                const hrs = Math.floor((msRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                return { text: days > 0 ? `${days}d ${hrs}h LEFT` : `${hrs}h LEFT`, type: "warning", isLate: false };
            }
        }
        return { text: `COVERED`, type: "success", isLate: false };
    };

    const filteredLeads = useMemo(() => {
        let filtered = openSemLeads;
        
        if (activeRound === 'enrolled') {
            filtered = filtered.filter(l => l?.enrollmentStatus === 'ENROLLED');
        } else {
            filtered = filtered.filter(l => l?.enrollmentStatus !== 'ENROLLED');
            if (activeRound === 'r1') filtered = filtered.filter(l => (l?.coordinationRound || 1) === 1);
            if (activeRound === 'r2') filtered = filtered.filter(l => l?.coordinationRound === 2);
            if (activeRound === 'r3') filtered = filtered.filter(l => l?.coordinationRound >= 3);
        }
        
        if (activePhase !== 'ALL') filtered = filtered.filter(l => l?.phase === activePhase);

        if (statusFilter !== 'ALL') {
            filtered = filtered.filter(l => statusFilter === 'pending' ? (!l?.callStatus || l?.callStatus === 'pending') : l?.callStatus === statusFilter);
        }

        if (showOnlyDelayed) {
            filtered = filtered.filter(l => checkIsLate(l));
        }

        if (searchQuery) {
            const sq = searchQuery.toLowerCase();
            filtered = filtered.filter(l => l?.phone?.includes(sq) || (l?.name && l?.name?.toLowerCase().includes(sq)));
        }

        return filtered;
    }, [openSemLeads, activeRound, activePhase, statusFilter, searchQuery, showOnlyDelayed]);

    const groupedLeads = useMemo(() => {
        const groups = {};
        
        filteredLeads.forEach(lead => {
            if (!lead) return;
            
            let targetDate = lead.newInqTimestamp || lead.createdAt;
            if (lead.phase > 1 || (lead.coordinationRound || 1) > 1 || (lead.callStatus && lead.callStatus !== 'pending')) {
                targetDate = lead.updatedAt || lead.createdAt;
            }

            const shiftInfo = getShiftData(targetDate);
            const label = shiftInfo.label;

            if (!groups[label]) {
                groups[label] = { 
                    label: label, timestamp: shiftInfo.timestamp, leads: [], 
                    stats: { assigned: 0, covered: 0, pending: 0, delayed: 0 } 
                };
            }

            groups[label].leads.push(lead);
            groups[label].stats.assigned++;
            
            const isPending = !lead.callStatus || lead.callStatus === 'pending';
            if (isPending) groups[label].stats.pending++;
            else groups[label].stats.covered++;
            
            if (checkIsLate(lead)) groups[label].stats.delayed++;
        });

        const sortedGroups = Object.values(groups).sort((a, b) => b.timestamp - a.timestamp);

        sortedGroups.forEach(group => {
            group.leads.sort((a, b) => {
                const aPending = !a?.callStatus || a?.callStatus === 'pending';
                const bPending = !b?.callStatus || b?.callStatus === 'pending';
                if (aPending && !bPending) return -1;
                if (!aPending && bPending) return 1;
                return new Date(b?.updatedAt || 0) - new Date(a?.updatedAt || 0);
            });
        });

        return sortedGroups;
    }, [filteredLeads]);
    
    const overallStats = useMemo(() => {
        const totalAssign = openSemLeads.length;
        const totalCovered = openSemLeads.filter(l => l?.callStatus && l?.callStatus !== 'pending').length;
        const totalPending = totalAssign - totalCovered;
        const totalLate = openSemLeads.filter(l => checkIsLate(l)).length;
        const totalEnrolled = openSemLeads.filter(l => l?.enrollmentStatus === 'ENROLLED').length;
        const enrollPercent = totalAssign > 0 ? ((totalEnrolled / totalAssign) * 100).toFixed(1) : 0;

        let r1Assign = 0, r1Covered = 0, r1Pending = 0;
        let r2Assign = 0, r2Covered = 0, r2Pending = 0;
        let r3Assign = 0, r3Covered = 0, r3Pending = 0;

        openSemLeads.forEach(l => {
            if (!l || l.enrollmentStatus === 'ENROLLED') return;
            const round = l.coordinationRound || 1;
            const isPending = !l.callStatus || l.callStatus === 'pending';

            if (round === 1) {
                r1Assign++;
                if (isPending) r1Pending++; else r1Covered++;
            } else if (round === 2) {
                r2Assign++;
                if (isPending) r2Pending++; else r2Covered++;
            } else if (round >= 3) {
                r3Assign++;
                if (isPending) r3Pending++; else r3Covered++;
            }
        });

        return { 
            totalAssign, totalCovered, totalPending, totalLate, totalEnrolled, enrollPercent, 
            r1Assign, r1Covered, r1Pending,
            r2Assign, r2Covered, r2Pending,
            r3Assign, r3Covered, r3Pending 
        };
    }, [openSemLeads]);

    const pieData = [
        { name: 'Covered', value: overallStats.totalCovered, color: '#10b981' },
        { name: 'Pending', value: overallStats.totalPending, color: '#f59e0b' }
    ];

    const handlePushToNextRound = async (leadId, currentRound, callStatus) => {
        if (callStatus === 'pending' || !callStatus) return toast.error("Change Status before pushing!");
        if (callStatus === 'no_answer') return toast.error("Student must be Answered or Rejected to Push to Next Round.");

        if (!window.confirm(`Move this lead to Round ${currentRound + 1}? Previous Remarks will be kept, but status will reset as a Fresh Lead.`)) return;
        
        const loadToast = toast.loading("Moving lead to next round...");
        try {
            await axios.post('/after-seminar-crm/leads/bulk-action', { action: 'CHANGE_ROUND', leadIds: [leadId], targetRound: currentRound + 1 }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }});
            toast.success("Lead pushed successfully! Fresh copy created.", { id: loadToast });
            setTimeout(() => window.location.reload(), 800);
        } catch(e) { toast.error("Failed to push lead.", { id: loadToast }); }
    };

    return (
        <div className="flex flex-col h-full w-full text-slate-200">
            <div className="flex flex-col xl:flex-row gap-4 mb-5 shrink-0">
                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { id: 'r1', label: 'ROUND 1', color: 'indigo', icon: <FaSyncAlt/>, count: overallStats.r1Assign },
                        { id: 'r2', label: 'ROUND 2', color: 'amber', icon: <FaSyncAlt/>, count: overallStats.r2Assign },
                        { id: 'r3', label: 'ROUND 3', color: 'rose', icon: <FaSyncAlt/>, count: overallStats.r3Assign },
                        { id: 'enrolled', label: 'PAID', color: 'emerald', icon: <FaUserGraduate/>, count: overallStats.totalEnrolled }
                    ].map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => { setActiveRound(tab.id); setDisplayLimit(36); }}
                            className={`p-4 rounded-xl border transition-all duration-300 flex items-center justify-between gap-3 shadow-md ${
                                activeRound === tab.id 
                                ? `bg-${tab.color}-600 border-${tab.color}-500 text-white shadow-[0_4px_20px_rgba(var(--tw-colors-${tab.color}-500),0.4)] scale-[1.02]` 
                                : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300 hover:text-white'
                            }`}
                        >
                            <span className={`flex items-center gap-2 text-xs md:text-sm font-black tracking-widest ${activeRound === tab.id ? 'text-white' : ''}`}>
                                {tab.icon} {tab.label}
                            </span>
                            <span className={`text-base md:text-lg font-black bg-black/30 px-3 py-1 rounded-lg ${activeRound === tab.id ? 'text-white' : `text-${tab.color}-400`}`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>
                <button onClick={() => setIsStatsOpen(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-transform xl:w-48 shrink-0">
                    <FaChartPie size={18}/> View Stats
                </button>
            </div>

            <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-black/20 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 mb-6 shrink-0 shadow-sm">
                <div className="flex flex-wrap lg:flex-nowrap w-full lg:w-auto items-center gap-3">
                    <div className="relative flex-1 min-w-[220px]">
                        <FaSearch className="absolute left-3.5 top-3.5 text-slate-400 text-sm" />
                        <input type="text" placeholder="Search Phone or Name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-900/80 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium text-white placeholder-slate-400 outline-none focus:border-indigo-500 transition-colors" />
                    </div>

                    <select value={typingMode} onChange={(e) => setTypingMode(e.target.value)} className="bg-slate-900/80 border border-slate-700 rounded-xl py-2.5 px-3 text-xs font-bold uppercase tracking-wide text-white outline-none cursor-pointer focus:border-indigo-500 w-24 shrink-0">
                        <option value="en" className="bg-slate-900 text-white">ENG</option>
                        <option value="si-phonetic" className="bg-slate-900 text-white">SIN</option>
                    </select>

                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-slate-900/80 border border-slate-700 rounded-xl py-2.5 px-3 text-xs font-bold uppercase tracking-wide text-white outline-none cursor-pointer focus:border-indigo-500">
                        <option value="ALL" className="bg-slate-900 text-white">All Status</option>
                        <option value="pending" className="bg-slate-900 text-white">⏳ Pending</option>
                        <option value="answered" className="bg-slate-900 text-white">✅ Answered</option>
                        <option value="no_answer" className="bg-slate-900 text-white">📵 No Answer</option>
                        <option value="reject" className="bg-slate-900 text-white">❌ Rejected</option>
                    </select>

                    <button onClick={() => setShowOnlyDelayed(!showOnlyDelayed)} className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border flex items-center gap-2 ${showOnlyDelayed ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:bg-slate-800'}`}>
                        <FaExclamationTriangle size={14}/> Delayed
                    </button>
                </div>

                <div className="flex gap-2 w-full lg:w-auto bg-slate-900/80 p-1.5 rounded-xl border border-slate-700">
                    {[1, 2, 3, 'ALL'].map(ph => (
                        <button key={ph} onClick={() => setActivePhase(ph)} className={`px-5 py-2 rounded-lg text-xs font-bold uppercase transition-all ${activePhase === ph ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}>
                            {ph === 'ALL' ? 'All Phases' : `Phase ${ph}`}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pb-10 pr-2">
                {groupedLeads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-16 text-center bg-white/5 rounded-2xl border border-white/10 shadow-sm">
                        <FaFilter size={40} className="mb-4 text-slate-500 opacity-30" />
                        <p className="text-lg text-slate-400 font-bold">No leads found for current filters</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {groupedLeads.map((group, gIdx) => (
                            <div key={gIdx} className="space-y-4">
                                <div className="sticky top-0 z-10 py-1 backdrop-blur-md">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-[#1e293b]/95 border border-slate-700/50 rounded-xl px-5 py-3 shadow-lg gap-4">
                                        <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
                                            {group.label}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-4 md:gap-6">
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                                                <span>Assign:</span> <span className="text-white text-sm bg-black/30 px-2 py-0.5 rounded border border-white/10">{group.stats.assigned}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                                                <FaCheckCircle className="text-emerald-400"/> <span>Cov:</span> <span className="text-emerald-400 text-sm bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">{group.stats.covered}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                                                <FaClock className="text-amber-400"/> <span>Pen:</span> <span className="text-amber-400 text-sm bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">{group.stats.pending}</span>
                                            </div>
                                            {group.stats.delayed > 0 && (
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-red-400 animate-pulse">
                                                    <FaExclamationTriangle/> <span>Delay:</span> <span className="bg-red-500/20 px-2 py-0.5 rounded text-sm border border-red-500/20">{group.stats.delayed}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 px-2">
                                    {group.leads.slice(0, displayLimit).map((lead, idx) => {
                                        if (!lead) return null;
                                        return (
                                            <LeadCard 
    key={lead.id || `lead-${idx}`} 
    lead={{...lead, realIndex: idx + 1}} 
    timer={getTimerDataText(lead)} 
    drafts={drafts} 
    activeTab={activeRound === 'enrolled' ? 'ENROLLED' : `ROUND_${activeRound.replace('r','')}`} 
    isManager={isManager} 
    typingMode={typingMode} 
    // 🔥 මෙතන තමයි වෙනස 🔥
    handleUpdateLocalLead={(id, field, value) => {
        // මේකෙන් දැනට තියෙන array එකේ අගයන් වෙනස් කරනවා refresh නොකර
        if (typeof handleUpdateLocalLead === 'function') {
            handleUpdateLocalLead(id, field, value);
        }
    }} 
    handleLocalCallStatusChange={(l, ns) => {
        if (typeof handleUpdateLocalLead === 'function') {
            handleUpdateLocalLead(l.id, 'callStatus', ns);
        }
    }} 
    handleRemarkTyping={(id, v) => setDrafts(p => ({...p, [id]: v}))} 
    handleSaveCallData={handleSaveCallData} 
    handlePushToNextRound={handlePushToNextRound} 
    handleTempUnlock={handleTempUnlock} 
    setChatModalLead={setChatModalLead}
/>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        {filteredLeads.length > displayLimit && (
                            <div className="flex justify-center mt-6">
                                <button onClick={() => setDisplayLimit(p => p + 36)} className="px-8 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-sm font-bold text-white transition-colors shadow-lg">
                                    Load More Leads ({filteredLeads.length - displayLimit} remaining)
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {isStatsOpen && (
                <div className="fixed inset-0 z-[100] flex justify-end bg-black/60 backdrop-blur-sm transition-all">
                    <div className="w-full max-w-[400px] bg-[#0f172a] h-full shadow-2xl flex flex-col border-l border-slate-700 animate-fade-in-right">
                        <div className="p-5 bg-white/5 border-b border-white/10 flex justify-between items-center shrink-0">
                            <h2 className="text-base font-black uppercase text-white flex items-center gap-2"><FaChartPie className="text-indigo-400"/> Overall Campaign Stats</h2>
                            <button onClick={() => setIsStatsOpen(false)} className="text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-lg transition-colors"><FaTimes size={14}/></button>
                        </div>
                        
                        <div className="p-6 flex flex-col gap-5 overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 shadow-sm flex flex-col justify-center items-center text-center">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Total Assigned</p>
                                    <p className="text-2xl font-black text-white">{overallStats.totalAssign}</p>
                                </div>
                                <div className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20 shadow-sm flex flex-col justify-center items-center text-center">
                                    <p className="text-[10px] text-emerald-400 font-bold uppercase mb-1">Enrolled (Paid)</p>
                                    <p className="text-2xl font-black text-emerald-400">{overallStats.totalEnrolled} <span className="text-xs">({overallStats.enrollPercent}%)</span></p>
                                </div>
                                <div className="bg-indigo-500/10 p-4 rounded-2xl border border-indigo-500/20 shadow-sm flex flex-col justify-center items-center text-center">
                                    <p className="text-[10px] text-indigo-400 font-bold uppercase mb-1">Total Covered</p>
                                    <p className="text-2xl font-black text-indigo-400">{overallStats.totalCovered}</p>
                                </div>
                                <div className="bg-amber-500/10 p-4 rounded-2xl border border-amber-500/20 shadow-sm flex flex-col justify-center items-center text-center">
                                    <p className="text-[10px] text-amber-400 font-bold uppercase mb-1">Pending Calls</p>
                                    <p className="text-2xl font-black text-amber-400">{overallStats.totalPending}</p>
                                </div>
                            </div>
                            
                            <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20 shadow-sm flex items-center justify-between">
                                <p className="text-xs text-red-400 font-bold uppercase flex items-center gap-2"><FaExclamationTriangle/> Late / Delayed Leads</p>
                                <p className="text-xl font-black text-red-400">{overallStats.totalLate}</p>
                            </div>

                            <div className="bg-white/5 p-5 rounded-2xl border border-white/10 shadow-sm">
                                <p className="text-xs font-bold text-slate-300 mb-2 uppercase text-center tracking-wider">Coverage Ratio</p>
                                <div className="h-48 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={5} dataKey="value" stroke="none">
                                                {pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px'}} />
                                            <Legend verticalAlign="bottom" height={30} wrapperStyle={{fontSize: '11px', fontWeight: 'bold'}} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="bg-white/5 p-5 rounded-2xl border border-white/10 shadow-sm">
                                <p className="text-xs font-bold text-slate-300 mb-4 uppercase text-center tracking-wider">Rounds Breakdown</p>
                                <div className="space-y-3">
                                    {[
                                        { name: 'Round 1', total: overallStats.r1Assign, cov: overallStats.r1Covered, pen: overallStats.r1Pending, color: 'indigo' },
                                        { name: 'Round 2', total: overallStats.r2Assign, cov: overallStats.r2Covered, pen: overallStats.r2Pending, color: 'amber' },
                                        { name: 'Round 3', total: overallStats.r3Assign, cov: overallStats.r3Covered, pen: overallStats.r3Pending, color: 'rose' }
                                    ].map(r => (
                                        <div key={r.name} className="bg-black/20 border border-white/10 rounded-xl p-3 flex justify-between items-center">
                                            <div>
                                                <p className={`text-xs font-black text-${r.color}-400`}>{r.name}</p>
                                                <p className="text-[10px] text-slate-400 font-bold mt-0.5">Leads: <span className="text-white">{r.total}</span></p>
                                            </div>
                                            <div className="flex gap-4">
                                                <div className="text-center">
                                                    <p className="text-[10px] text-emerald-400 font-bold">Covered</p>
                                                    <p className="text-sm font-black text-white">{r.cov}</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-[10px] text-amber-400 font-bold">Pending</p>
                                                    <p className="text-sm font-black text-white">{r.pen}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}