import React, { useState, useEffect } from 'react';
import axios from '../../../api/axios';
import { 
    FaUserTie, FaDownload, FaUsers, FaPhoneAlt, FaComments, FaFilter, FaChartPie, FaChartBar, FaBullseye
} from 'react-icons/fa';
import { 
    Calendar as CalendarIcon, PhoneCall, MessageSquare,
    TrendingUp, Layers, Zap, UserCheck, FileText,
    ChevronRight, Activity, Search, ShieldCheck, PieChart as PieChartIcon, BarChart2, Briefcase
} from 'lucide-react';
import { 
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area 
} from 'recharts';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

// Helper Component: Circular Progress Ring (Soft Indigo / Emerald Color System)
function CircularProgressRing({ percentage, size = 68, strokeWidth = 6, color = '#6366F1', label }) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative inline-flex items-center justify-center">
            <svg width={size} height={size} className="transform -rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="#334155"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={isNaN(offset) ? circumference : offset}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-1000 ease-out"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xs font-black text-white">{percentage}%</span>
                {label && <span className="text-[8px] font-bold text-slate-400 uppercase">{label}</span>}
            </div>
        </div>
    );
}

// Helper Component: Visual Progress Bar
function VisualProgressBar({ value, max, color = 'bg-indigo-500', label, subtext }) {
    const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
    return (
        <div className="space-y-1 w-full">
            <div className="flex justify-between items-center text-[11px] font-bold">
                <span className="text-slate-300">{label}</span>
                <span className="text-white font-extrabold">{value} <span className="text-slate-500 font-medium">({pct}%)</span></span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
                <div 
                    className={`h-full rounded-full transition-all duration-700 ease-out ${color}`} 
                    style={{ width: `${pct}%` }}
                ></div>
            </div>
            {subtext && <span className="text-[9px] text-slate-400 font-medium block">{subtext}</span>}
        </div>
    );
}

export default function CoordinatorProgressSheet({ filters = {} }) {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        coordinators: [],
        rawLeads: []
    });

    // Search, Date Range and Sort controls
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('assigned'); // 'assigned', 'paid', 'answerRate'
    const [startDate, setStartDate] = useState('2026-08-10');
    const [endDate, setEndDate] = useState('2026-08-18');
    const [selectedCoordId, setSelectedCoordId] = useState('ALL');

    useEffect(() => {
        fetchProgressStats();
    }, [filters.selectedBusiness, filters.selectedBatch, startDate, endDate, selectedCoordId]);

    const fetchProgressStats = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const biz = filters.selectedBusiness || 'ALL';
            const bat = filters.selectedBatch || 'ALL';

            const res = await axios.get('/after-seminar-crm/stats/coordinator-progress', {
                headers: { Authorization: `Bearer ${token}` },
                params: { 
                    businessId: biz, 
                    batchId: bat,
                    startDate: startDate,
                    endDate: endDate,
                    coordinatorId: selectedCoordId
                }
            });
            setStats(res.data);
        } catch (error) {
            console.error("Failed to load coordinator progress stats", error);
            toast.error("Failed to load Coordinator Progress.");
        } finally {
            setLoading(false);
        }
    };

    const handleExportWordDoc = async () => {
        try {
            toast.loading("Generating Word Document (.docx)...", { id: 'word-export' });
            const token = localStorage.getItem('token');
            const biz = filters.selectedBusiness || 'ALL';
            const bat = filters.selectedBatch || 'ALL';

            const response = await axios.get('/after-seminar-crm/export-coordinator-word-doc', {
                headers: { Authorization: `Bearer ${token}` },
                params: {
                    businessId: biz,
                    batchId: bat,
                    startDate: startDate,
                    endDate: endDate,
                    coordinatorId: selectedCoordId
                },
                responseType: 'blob'
            });

            const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Coordinator_Performance_Report_${startDate}_to_${endDate}.docx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success("Word Document downloaded successfully!", { id: 'word-export' });
        } catch (error) {
            console.error("Failed to export Word document", error);
            toast.error("Failed to export Word document.", { id: 'word-export' });
        }
    };

    const handleExportToExcel = () => {
        if (!stats.rawLeads || stats.rawLeads.length === 0) {
            toast.error("No data available to export.");
            return;
        }

        const exportData = stats.rawLeads.map(l => ({
            "Coordinator Name": l.coordinatorName,
            "Student Phone": l.phone,
            "Student Name": l.name,
            "Campaign": l.campaignType,
            "Inquiry Type": l.inquiryType,
            "Round": l.round,
            "Phase": l.phase,
            "Call Status": l.callStatus,
            "Enrollment": l.enrollmentStatus,
            "Payment Plan": l.paymentPlan,
            "Remark": l.remark
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Coordinator_Progress");
        XLSX.writeFile(workbook, `Coordinator_Progress_Sheet_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success("Full Coordinator Report Exported successfully!");
    };

    // Filter active team coordinators for business (at least 3 assigned leads to filter out 1-lead test staff)
    const activeStaffList = (stats.coordinators || []).filter(c => (c.totalAssigned || 0) > 0);
    const mainActiveStaff = activeStaffList.filter(c => (c.totalAssigned || 0) >= 3);
    const chartCoordinators = mainActiveStaff.length > 0 ? mainActiveStaff : activeStaffList;

    const totalCoordinatorsCount = chartCoordinators.length;

    // Calculate aggregated overall stats for top summary cards & charts
    const totalFreeSemAssigned = (stats.coordinators || []).reduce((acc, c) => acc + (c.freeSem?.assignedCount || 0), 0);
    const totalOpenSemAssigned = (stats.coordinators || []).reduce((acc, c) => acc + (c.afterSem?.openSem?.assignedCount || 0), 0);
    const totalNewInqAssigned = (stats.coordinators || []).reduce((acc, c) => acc + (c.afterSem?.newInq?.assignedCount || 0), 0);
    const totalAfterSemAssigned = totalOpenSemAssigned + totalNewInqAssigned;
    const totalPaidEnrolled = (stats.coordinators || []).reduce((acc, c) => acc + (c.afterSem?.combinedTotals?.totalPaid || 0), 0);
    const overallTotalLeads = totalFreeSemAssigned + totalAfterSemAssigned;
    const overallPaidConversionPct = overallTotalLeads > 0 ? Math.round((totalPaidEnrolled / overallTotalLeads) * 100) : 0;

    // Data for Donut Chart (Lead Channel Breakdown)
    const channelPieData = [
        { name: 'Free Sem CRM', value: totalFreeSemAssigned, color: '#38BDF8' },
        { name: 'Open Seminar', value: totalOpenSemAssigned, color: '#8B5CF6' },
        { name: 'New Inquiries', value: totalNewInqAssigned, color: '#6366F1' },
    ].filter(d => d.value > 0);

    // Data for Bar Chart (Coordinator Lead vs Paid Comparison with UNIQUE displayName to prevent Recharts bar overlap)
    const coordinatorBarData = chartCoordinators.map(c => ({
        displayName: `${c.name || 'Coord'} (#${c.id})`,
        shortName: c.name ? c.name.split(' ')[0] : 'Coord',
        Assigned: c.totalAssigned || 0,
        Paid: c.afterSem?.combinedTotals?.totalPaid || 0,
    }));

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 bg-slate-900 rounded-3xl border border-slate-800">
                <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                <p className="text-indigo-400 font-extrabold text-xs tracking-widest uppercase animate-pulse">
                    Loading Class Coordination Manager Dashboard Analytics...
                </p>
            </div>
        );
    }

    const filteredCoordinators = (stats.coordinators || [])
        .filter(c => (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => {
            if (sortBy === 'paid') return (b.afterSem?.combinedTotals?.totalPaid || 0) - (a.afterSem?.combinedTotals?.totalPaid || 0);
            if (sortBy === 'answerRate') return (b.freeSem?.callAnswerRate || 0) - (a.freeSem?.callAnswerRate || 0);
            return (b.totalAssigned || 0) - (a.totalAssigned || 0);
        });

    return (
        <div className="space-y-8 animate-fade-in text-left bg-[#0B0F19] text-slate-100 p-4 md:p-8 rounded-3xl font-sans min-h-screen">
            
            {/* EXECUTIVE MANAGER HEADER BANNER */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2.5 mb-2">
                        <span className="bg-indigo-500/20 text-indigo-300 text-xs font-black uppercase px-3 py-1 rounded-full border border-indigo-500/30 tracking-wider flex items-center gap-1.5">
                            <Briefcase size={14} className="text-indigo-400" /> Class Coordination Managers Portal
                        </span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        Class Coordination Managers Dashboard — Coordinators Tracking
                    </h1>
                    <p className="text-slate-400 text-xs md:text-sm mt-1.5 font-medium max-w-3xl">
                        Executive monitoring center for Class Coordination Managers to track team lead pipeline, daily messaging/call velocity, and verified paid conversion metrics.
                    </p>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex items-center gap-3 shrink-0">
                    <button 
                        onClick={handleExportWordDoc}
                        className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white px-5 py-3 rounded-2xl font-black text-xs flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 cursor-pointer border border-indigo-400/30 uppercase tracking-wider"
                    >
                        <FileText size={16} /> Export Word Doc (.docx)
                    </button>
                    <button 
                        onClick={handleExportToExcel}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
                    >
                        <FaDownload size={13} /> Export Excel
                    </button>
                </div>
            </div>

            {/* TOP EXECUTIVE OVERVIEW CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Card 1: Active Staff */}
                <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
                    <span className="text-xs font-semibold text-slate-400 block mb-1">Active Coordinators</span>
                    <div className="flex items-baseline justify-between mt-2">
                        <h3 className="text-3xl font-black text-white tracking-tight">{totalCoordinatorsCount}</h3>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-300 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                            Manager Active Team
                        </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-3 font-medium">Assigned Class Coordination Staff</p>
                </div>

                {/* Card 2: Free Sem Assigned */}
                <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-sky-500/30 transition-all">
                    <span className="text-xs font-semibold text-slate-400 block mb-1">Total Free Sem Assigned</span>
                    <div className="flex items-baseline justify-between mt-2">
                        <h3 className="text-3xl font-black text-sky-400 tracking-tight">{totalFreeSemAssigned}</h3>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-300 bg-sky-950/50 px-2.5 py-1 rounded-lg border border-sky-500/30">
                            Free Seminar Pool
                        </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-3 font-medium">Free Campaign Student Leads</p>
                </div>

                {/* Card 3: After Sem Assigned */}
                <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-purple-500/30 transition-all">
                    <span className="text-xs font-semibold text-slate-400 block mb-1">Total After Sem Assigned</span>
                    <div className="flex items-baseline justify-between mt-2">
                        <h3 className="text-3xl font-black text-purple-400 tracking-tight">{totalAfterSemAssigned}</h3>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-300 bg-purple-950/50 px-2.5 py-1 rounded-lg border border-purple-500/30">
                            Open + New Inq
                        </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-3 font-medium">After Seminar Channels</p>
                </div>

                {/* Card 4: Total Paid Conversions & Radial Ring */}
                <div className="bg-slate-900/90 border border-indigo-500/30 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-indigo-500/50 transition-all flex items-center justify-between">
                    <div>
                        <span className="text-xs font-semibold text-slate-400 block mb-1">Total Paid Conversions</span>
                        <h3 className="text-3xl font-black text-emerald-400 tracking-tight">{totalPaidEnrolled}</h3>
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-300 bg-emerald-950/60 px-2.5 py-0.5 rounded-lg mt-2 border border-emerald-500/30">
                            <TrendingUp size={12} /> Target Conversion
                        </span>
                    </div>
                    <CircularProgressRing percentage={overallPaidConversionPct} size={64} color="#10B981" label="Conv Rate" />
                </div>
            </div>

            {/* VISUAL CHARTS PANEL (Donut Chart & Staff Comparison Bar Chart) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* CHART 1: LEAD PIPELINE DONUT CHART */}
                <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl space-y-3 shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                            <PieChartIcon size={16} className="text-sky-400" /> Lead Pipeline Distribution
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700">
                            Volume Split
                        </span>
                    </div>

                    <div className="h-48 relative flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={channelPieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={72}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {channelPieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <RechartsTooltip 
                                    contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} 
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-xl font-black text-white">{overallTotalLeads}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Total Leads</span>
                        </div>
                    </div>

                    <div className="flex justify-around items-center pt-2 border-t border-slate-800 text-[11px] font-bold">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
                            <span className="text-slate-300">Free Sem: <strong className="text-white">{totalFreeSemAssigned}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                            <span className="text-slate-300">Open Sem: <strong className="text-white">{totalOpenSemAssigned}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                            <span className="text-slate-300">New Inq: <strong className="text-white">{totalNewInqAssigned}</strong></span>
                        </div>
                    </div>
                </div>

                {/* CHART 2: COORDINATOR PERFORMANCE BAR COMPARISON */}
                <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl space-y-3 lg:col-span-2 shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                            <BarChart2 size={16} className="text-indigo-400" /> Managerial Staff Comparison (Assigned Leads vs Paid Enrollments)
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700">
                            Team Overview
                        </span>
                    </div>

                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart key={String(filters.selectedBusiness) + '-' + coordinatorBarData.length} data={coordinatorBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                                <XAxis dataKey="displayName" tickFormatter={(val) => val.split(' (#')[0]} stroke="#94A3B8" fontSize={11} tickLine={false} />
                                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                                <RechartsTooltip 
                                    contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} 
                                />
                                <Bar dataKey="Assigned" fill="#6366F1" radius={[6, 6, 0, 0]} />
                                <Bar dataKey="Paid" fill="#10B981" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="flex items-center justify-end gap-5 pt-2 border-t border-slate-800 text-[11px] font-bold">
                        <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded bg-indigo-500"></span>
                            <span className="text-slate-300">Total Assigned Leads</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded bg-emerald-500"></span>
                            <span className="text-slate-300">Paid Enrolled Conversions</span>
                        </div>
                    </div>
                </div>

            </div>

            {/* CONTROLS & DATE RANGE TOOLBAR */}
            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col xl:flex-row items-center justify-between gap-4 shadow-xl">
                
                {/* Search & Tabs */}
                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                    <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3.5 py-2 rounded-xl w-full sm:w-64 focus-within:border-indigo-500 transition-all">
                        <Search size={14} className="text-slate-400" />
                        <input 
                            type="text"
                            placeholder="Search Coordinator..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-transparent text-xs text-white placeholder-slate-500 outline-none w-full font-medium"
                        />
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-1">
                        <button
                            onClick={() => setSelectedCoordId('ALL')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${selectedCoordId === 'ALL' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'}`}
                        >
                            All Coordinators ({stats.coordinators?.length || 0})
                        </button>

                        {(stats.coordinators || []).map(c => (
                            <button
                                key={c.id}
                                onClick={() => setSelectedCoordId(String(c.id))}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${String(selectedCoordId) === String(c.id) ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'}`}
                            >
                                {c.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Date Range Selector */}
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3.5 py-2 rounded-xl text-xs w-full xl:w-auto justify-between sm:justify-start">
                    <div className="flex items-center gap-1.5 text-slate-400">
                        <CalendarIcon size={14} className="text-indigo-400" />
                        <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Date Activity:</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <input 
                            type="date" 
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-slate-900 text-white font-bold text-xs border border-slate-700 rounded-lg px-2.5 py-1 outline-none cursor-pointer focus:border-indigo-500"
                        />
                        <span className="text-slate-500 font-bold">to</span>
                        <input 
                            type="date" 
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-slate-900 text-white font-bold text-xs border border-slate-700 rounded-lg px-2.5 py-1 outline-none cursor-pointer focus:border-indigo-500"
                        />
                    </div>
                </div>

            </div>

            {/* MAIN COORDINATOR CARDS */}
            {filteredCoordinators.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 p-16 rounded-3xl text-center text-slate-400">
                    <UserCheck size={48} className="mx-auto mb-3 text-slate-600" />
                    <h3 className="text-lg font-bold text-white mb-1">No Coordinators Found</h3>
                    <p className="text-xs text-slate-500">Try adjusting your search or business/batch filters.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {filteredCoordinators.map((coord) => {
                        const free = coord.freeSem || {};
                        const after = coord.afterSem || {};
                        const openSem = after.openSem || {};
                        const newInq = after.newInq || {};
                        const combined = after.combinedTotals || {};
                        const paidPct = combined.totalLeads > 0 ? Math.round((combined.totalPaid / combined.totalLeads) * 100) : 0;

                        return (
                            <div 
                                key={coord.id}
                                className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl relative overflow-hidden"
                            >
                                {/* COORDINATOR PROFILE HEADER */}
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                            {coord.name ? coord.name.charAt(0).toUpperCase() : 'C'}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h2 className="text-xl font-extrabold text-white">{coord.name}</h2>
                                                <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-950/60 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-md">
                                                    Coordinator #{coord.id}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-0.5 font-medium">Class Coordination Staff Performance Breakdown</p>
                                        </div>
                                    </div>

                                    {/* High Level Key Badges & Circular Ring */}
                                    <div className="flex items-center gap-4">
                                        <div className="flex flex-wrap items-center gap-2.5">
                                            <div className="bg-slate-950 border border-slate-800 px-3.5 py-2 rounded-xl text-center">
                                                <span className="text-[10px] font-bold text-slate-400 block uppercase">Total Assigned</span>
                                                <span className="text-base font-black text-white">{coord.totalAssigned || 0}</span>
                                            </div>
                                            <div className="bg-slate-950 border border-slate-800 px-3.5 py-2 rounded-xl text-center">
                                                <span className="text-[10px] font-bold text-sky-400 block uppercase">Free Sem</span>
                                                <span className="text-base font-black text-sky-400">{free.assignedCount || 0}</span>
                                            </div>
                                            <div className="bg-slate-950 border border-slate-800 px-3.5 py-2 rounded-xl text-center">
                                                <span className="text-[10px] font-bold text-purple-400 block uppercase">After Sem</span>
                                                <span className="text-base font-black text-purple-400">{after.assignedCount || 0}</span>
                                            </div>
                                            <div className="bg-slate-950 border border-emerald-500/30 px-3.5 py-2 rounded-xl text-center">
                                                <span className="text-[10px] font-bold text-emerald-400 block uppercase">Paid Conversions</span>
                                                <span className="text-base font-black text-emerald-400">{combined.totalPaid || 0}</span>
                                            </div>
                                        </div>

                                        <CircularProgressRing percentage={paidPct} size={56} strokeWidth={5} color="#10B981" label="Paid %" />
                                    </div>
                                </div>

                                {/* THREE VISUAL CAMPAIGN MODULE TILES */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    
                                    {/* TILE 1: FREE SEMINAR CRM VISUAL TILE */}
                                    <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4">
                                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                            <span className="text-xs font-black text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                                                <PhoneCall size={14} /> Free Sem CRM
                                            </span>
                                            <span className="bg-sky-950/60 text-sky-300 text-[10px] font-black px-2.5 py-0.5 rounded-md border border-sky-500/30">
                                                Assigned: {free.assignedCount || 0}
                                            </span>
                                        </div>

                                        <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                                            <div>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Call Answer Velocity</span>
                                                <span className="text-sm font-black text-white block mt-0.5">
                                                    {free.phase1?.answer + free.phase2?.answer || 0} Calls Answered
                                                </span>
                                                <span className="text-[10px] text-sky-400 font-semibold mt-1 block">
                                                    Covered: {free.coveredCount || 0} / {free.assignedCount || 0}
                                                </span>
                                            </div>
                                            <CircularProgressRing percentage={free.callAnswerRate || 0} size={54} strokeWidth={5} color="#38BDF8" label="Answer" />
                                        </div>

                                        <div className="space-y-3 pt-1">
                                            <div className="space-y-1.5">
                                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Phase 1 Status Breakdown</span>
                                                <VisualProgressBar value={free.phase1?.answer || 0} max={free.phase1?.total || 1} color="bg-emerald-500" label="Answered" />
                                                <VisualProgressBar value={free.phase1?.noAnswer || 0} max={free.phase1?.total || 1} color="bg-slate-500" label="No Answer" />
                                                <VisualProgressBar value={free.phase1?.reject || 0} max={free.phase1?.total || 1} color="bg-rose-500" label="Rejected" />
                                            </div>

                                            <div className="space-y-1.5 pt-2 border-t border-slate-800">
                                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Phase 2 Status Breakdown</span>
                                                <VisualProgressBar value={free.phase2?.answer || 0} max={free.phase2?.total || 1} color="bg-emerald-500" label="Answered" />
                                                <VisualProgressBar value={free.phase2?.noAnswer || 0} max={free.phase2?.total || 1} color="bg-slate-500" label="No Answer" />
                                                <VisualProgressBar value={free.phase2?.reject || 0} max={free.phase2?.total || 1} color="bg-rose-500" label="Rejected" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* TILE 2: OPEN SEMINAR CAMPAIGN VISUAL TILE */}
                                    <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4">
                                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                            <span className="text-xs font-black text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                                                <Layers size={14} /> Open Seminar Campaign
                                            </span>
                                            <span className="bg-purple-950/60 text-purple-300 text-[10px] font-black px-2.5 py-0.5 rounded-md border border-purple-500/30">
                                                Assigned: {openSem.assignedCount || 0}
                                            </span>
                                        </div>

                                        <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 space-y-2">
                                            <div className="flex justify-between items-center text-xs font-bold">
                                                <span className="text-purple-300">Paid Enrollment Target</span>
                                                <span className="text-emerald-400 font-black">{openSem.paidCount || 0} ({openSem.paidPercentage || 0}%)</span>
                                            </div>
                                            <VisualProgressBar value={openSem.paidCount || 0} max={openSem.assignedCount || 1} color="bg-purple-500" />
                                        </div>

                                        <div className="space-y-3">
                                            <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-2">
                                                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">Round 1 Leads Funnel</span>
                                                <div className="grid grid-cols-4 gap-1.5 text-center">
                                                    <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                                                        <span className="text-[9px] text-slate-400 block uppercase">Active</span>
                                                        <span className="text-xs font-black text-emerald-400">{openSem.round1?.active || 0}</span>
                                                    </div>
                                                    <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                                                        <span className="text-[9px] text-slate-400 block uppercase">Pending</span>
                                                        <span className="text-xs font-black text-amber-400">{openSem.round1?.pending || 0}</span>
                                                    </div>
                                                    <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                                                        <span className="text-[9px] text-slate-400 block uppercase">No Ans</span>
                                                        <span className="text-xs font-black text-sky-400">{openSem.round1?.noAnswer || 0}</span>
                                                    </div>
                                                    <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                                                        <span className="text-[9px] text-slate-400 block uppercase">Reject</span>
                                                        <span className="text-xs font-black text-rose-400">{openSem.round1?.reject || 0}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-2">
                                                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">Round 2 Leads Funnel</span>
                                                <div className="grid grid-cols-4 gap-1.5 text-center">
                                                    <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                                                        <span className="text-[9px] text-slate-400 block uppercase">Active</span>
                                                        <span className="text-xs font-black text-emerald-400">{openSem.round2?.active || 0}</span>
                                                    </div>
                                                    <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                                                        <span className="text-[9px] text-slate-400 block uppercase">Pending</span>
                                                        <span className="text-xs font-black text-amber-400">{openSem.round2?.pending || 0}</span>
                                                    </div>
                                                    <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                                                        <span className="text-[9px] text-slate-400 block uppercase">No Ans</span>
                                                        <span className="text-xs font-black text-sky-400">{openSem.round2?.noAnswer || 0}</span>
                                                    </div>
                                                    <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                                                        <span className="text-[9px] text-slate-400 block uppercase">Reject</span>
                                                        <span className="text-xs font-black text-rose-400">{openSem.round2?.reject || 0}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* TILE 3: NEW INQUIRIES CAMPAIGN VISUAL TILE */}
                                    <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4">
                                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                            <span className="text-xs font-black text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                                                <Activity size={14} /> New Inquiries Campaign
                                            </span>
                                            <span className="bg-indigo-950/60 text-indigo-300 text-[10px] font-black px-2.5 py-0.5 rounded-md border border-indigo-500/30">
                                                Assigned: {newInq.assignedCount || 0}
                                            </span>
                                        </div>

                                        <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 space-y-2">
                                            <div className="flex justify-between items-center text-xs font-bold">
                                                <span className="text-indigo-300">Paid Enrollment Target</span>
                                                <span className="text-emerald-400 font-black">{newInq.paidCount || 0} ({newInq.paidPercentage || 0}%)</span>
                                            </div>
                                            <VisualProgressBar value={newInq.paidCount || 0} max={newInq.assignedCount || 1} color="bg-indigo-500" />
                                        </div>

                                        <div className="space-y-3">
                                            <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-2">
                                                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">Round 1 Leads Funnel</span>
                                                <div className="grid grid-cols-4 gap-1.5 text-center">
                                                    <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                                                        <span className="text-[9px] text-slate-400 block uppercase">Active</span>
                                                        <span className="text-xs font-black text-emerald-400">{newInq.round1?.active || 0}</span>
                                                    </div>
                                                    <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                                                        <span className="text-[9px] text-slate-400 block uppercase">Pending</span>
                                                        <span className="text-xs font-black text-amber-400">{newInq.round1?.pending || 0}</span>
                                                    </div>
                                                    <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                                                        <span className="text-[9px] text-slate-400 block uppercase">No Ans</span>
                                                        <span className="text-xs font-black text-sky-400">{newInq.round1?.noAnswer || 0}</span>
                                                    </div>
                                                    <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                                                        <span className="text-[9px] text-slate-400 block uppercase">Reject</span>
                                                        <span className="text-xs font-black text-rose-400">{newInq.round1?.reject || 0}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-2">
                                                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">Round 2 Leads Funnel</span>
                                                <div className="grid grid-cols-4 gap-1.5 text-center">
                                                    <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                                                        <span className="text-[9px] text-slate-400 block uppercase">Active</span>
                                                        <span className="text-xs font-black text-emerald-400">{newInq.round2?.active || 0}</span>
                                                    </div>
                                                    <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                                                        <span className="text-[9px] text-slate-400 block uppercase">Pending</span>
                                                        <span className="text-xs font-black text-amber-400">{newInq.round2?.pending || 0}</span>
                                                    </div>
                                                    <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                                                        <span className="text-[9px] text-slate-400 block uppercase">No Ans</span>
                                                        <span className="text-xs font-black text-sky-400">{newInq.round2?.noAnswer || 0}</span>
                                                    </div>
                                                    <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                                                        <span className="text-[9px] text-slate-400 block uppercase">Reject</span>
                                                        <span className="text-xs font-black text-rose-400">{newInq.round2?.reject || 0}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                </div>

                                {/* SECTION 08: DATE-WISE ACTIVITY BREAKDOWN TABLE */}
                                <div className="mt-8 pt-6 border-t border-slate-800 space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                                        <div>
                                            <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                                <FileText size={15} /> Date-Wise Messaging & Calling Activity ({startDate} — {endDate})
                                            </h4>
                                            <p className="text-slate-400 text-xs mt-0.5 font-medium">
                                                Daily count of unique student phone numbers messaged/called vs total messages & call attempts.
                                            </p>
                                        </div>
                                        <button
                                            onClick={handleExportWordDoc}
                                            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4 py-2 rounded-xl font-black flex items-center gap-2 shadow-sm transition-all hover:scale-105 cursor-pointer uppercase"
                                        >
                                            <FileText size={14} /> Export Word Doc
                                        </button>
                                    </div>

                                    {/* Sleek Dark Table */}
                                    <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
                                        <table className="w-full text-left border-collapse text-xs">
                                            <thead>
                                                <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase font-black tracking-wider">
                                                    <th className="py-3.5 px-4">Date</th>
                                                    <th className="py-3.5 px-4 text-center text-sky-400">Free Sem Unique Numbers</th>
                                                    <th className="py-3.5 px-4 text-center text-slate-300">Free Sem Msgs</th>
                                                    <th className="py-3.5 px-4 text-center text-amber-400">Free Sem Calls</th>
                                                    <th className="py-3.5 px-4 text-center text-indigo-400">All Unique Numbers</th>
                                                    <th className="py-3.5 px-4 text-center text-slate-300">All Msgs</th>
                                                    <th className="py-3.5 px-4 text-center text-purple-400">All Calls</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800/80 font-medium">
                                                {(coord.dateWiseBreakdown || []).map((row, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-900/60 transition-colors">
                                                        <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                                                            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                                            {row.date}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-center">
                                                            <span className="inline-block bg-sky-950/60 text-sky-300 font-black px-3 py-1 rounded-xl border border-sky-500/30">
                                                                {row.freeMsgUnique} Unique
                                                            </span>
                                                        </td>
                                                        <td className="py-3.5 px-4 text-center text-slate-300 font-semibold">{row.freeMsgTotal}</td>
                                                        <td className="py-3.5 px-4 text-center text-amber-400 font-bold">{row.freeCallsTotal}</td>
                                                        <td className="py-3.5 px-4 text-center">
                                                            <span className="inline-block bg-indigo-950/60 text-indigo-300 font-black px-3 py-1 rounded-xl border border-indigo-500/30">
                                                                {row.allMsgUnique} Unique
                                                            </span>
                                                        </td>
                                                        <td className="py-3.5 px-4 text-center text-slate-300 font-semibold">{row.allMsgTotal}</td>
                                                        <td className="py-3.5 px-4 text-center text-purple-400 font-bold">{row.allCallsTotal}</td>
                                                    </tr>
                                                ))}
                                                {coord.dateWiseTotals && (
                                                    <tr className="bg-slate-900 font-black text-white border-t-2 border-indigo-500/40">
                                                        <td className="py-4 px-4 uppercase text-indigo-300 font-black tracking-wider">TOTAL (Net)</td>
                                                        <td className="py-4 px-4 text-center">
                                                            <span className="bg-sky-600 text-white font-black px-3.5 py-1 rounded-xl text-xs shadow-md">
                                                                {coord.dateWiseTotals.freeMsgUniqueNet} Unique
                                                            </span>
                                                        </td>
                                                        <td className="py-4 px-4 text-center text-slate-200 font-extrabold">{coord.dateWiseTotals.freeMsgTotal} Msgs</td>
                                                        <td className="py-4 px-4 text-center text-amber-400 font-black">{coord.dateWiseTotals.freeCallsTotal} Calls</td>
                                                        <td className="py-4 px-4 text-center">
                                                            <span className="bg-indigo-600 text-white font-black px-3.5 py-1 rounded-xl text-xs shadow-md">
                                                                {coord.dateWiseTotals.allMsgUniqueNet} Unique
                                                            </span>
                                                        </td>
                                                        <td className="py-4 px-4 text-center text-slate-200 font-extrabold">{coord.dateWiseTotals.allMsgTotal} Msgs</td>
                                                        <td className="py-4 px-4 text-center text-purple-300 font-black">{coord.dateWiseTotals.allCallsTotal} Calls</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
