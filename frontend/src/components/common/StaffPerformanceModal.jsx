import React, { useState, useEffect } from 'react';
import { 
    X as CloseIcon, 
    Calendar, 
    CheckCircle, 
    XCircle, 
    User, 
    Bot, 
    Filter, 
    Search,
    BarChart3,
    Trophy,
    Activity,
    ShieldCheck,
    Clock
} from 'lucide-react';
import axios from '../../api/axios';

// Helper to get initials
const getInitials = (name) => {
    if (!name || name === 'Unknown') return 'U';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return 'U';
    return parts.map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

// Helper for consistent avatar colors based on string
const getAvatarColor = (str) => {
    const colors = [
        'bg-blue-500/20 text-blue-400 border-blue-500/30',
        'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        'bg-purple-500/20 text-purple-400 border-purple-500/30',
        'bg-amber-500/20 text-amber-400 border-amber-500/30',
        'bg-pink-500/20 text-pink-400 border-pink-500/30',
        'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

export default function StaffPerformanceModal({ onClose }) {
    const [reportData, setReportData] = useState([]);
    const [summary, setSummary] = useState({ 
        aiVerified: 0, manualVerified: 0, rejected: 0, total: 0,
        quickApprove: 0, discountApprove: 0, adjustApprove: 0, upgradeApprove: 0, installmentApprove: 0
    });
    const [loading, setLoading] = useState(false);
    
    // Filters (Default to today start of day to end of day)
    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
    const [dateFrom, setDateFrom] = useState(`${today}T00:00`);
    const [dateTo, setDateTo] = useState(`${today}T23:59`);
    const [verificationMethod, setVerificationMethod] = useState('all'); 
    const [actionFilter, setActionFilter] = useState('all');

    const fetchStaffStats = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/admin/payments/staff-stats-report', {
                params: { dateFrom, dateTo, verificationMethod, action: actionFilter }
            });
            if (res.data) {
                setReportData(res.data.data || []);
                setSummary(res.data.summary || { 
                    aiVerified: 0, manualVerified: 0, rejected: 0, total: 0,
                    quickApprove: 0, discountApprove: 0, adjustApprove: 0, upgradeApprove: 0, installmentApprove: 0
                });
            }
        } catch (error) {
            console.error("Failed to fetch staff stats report", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStaffStats();
    }, [verificationMethod, actionFilter]);

    // Calculate Leaderboard Data with Breakdown
    const staffBreakdownRaw = reportData.filter(r => !r.isAiVerified && r.verifiedBy !== 'Unknown').reduce((acc, row) => {
        if (!acc[row.verifiedBy]) {
            acc[row.verifiedBy] = { total: 0, quick: 0, discount: 0, adjust: 0, upgrade: 0, installment: 0 };
        }
        acc[row.verifiedBy].total += 1;
        
        if (row.approveType === 'Quick Approve') acc[row.verifiedBy].quick += 1;
        if (row.approveType === 'Discount Approve') acc[row.verifiedBy].discount += 1;
        if (row.approveType === 'Adjust Approve') acc[row.verifiedBy].adjust += 1;
        if (row.approveType === 'Upgrade Approve') acc[row.verifiedBy].upgrade += 1;
        if (row.approveType === 'Installment Approve') acc[row.verifiedBy].installment += 1;
        
        return acc;
    }, {});

    const staffBreakdown = Object.entries(staffBreakdownRaw).sort((a, b) => b[1].total - a[1].total);
    const maxStaffCount = staffBreakdown.length > 0 ? staffBreakdown[0][1].total : 1;

    return (
        <div className="fixed inset-0 z-[99999] bg-[#020617]/80 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
            {/* Main Modal Container */}
            <div className="bg-[#0B1221] w-full max-w-[90rem] max-h-[96vh] rounded-[24px] border border-white/10 shadow-[0_0_80px_-15px_rgba(59,130,246,0.15)] flex flex-col overflow-hidden relative">
                
                {/* Decorative background glows */}
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none"></div>

                {/* Header Section */}
                <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center relative z-10 bg-white/[0.01]">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/20 flex items-center justify-center shadow-inner">
                            <BarChart3 className="text-blue-400 w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight">Verification Report</h2>
                            <p className="text-sm text-slate-400 font-medium flex items-center gap-2 mt-0.5">
                                <Activity size={14} className="text-blue-400/70" />
                                Live tracking of AI and Manual actions
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-rose-500/20 border border-transparent hover:border-rose-500/30 text-slate-400 hover:text-rose-400 transition-all duration-300 shadow-sm"
                    >
                        <CloseIcon size={20} />
                    </button>
                </div>

                {/* Filters & Summary Section */}
                <div className="p-8 border-b border-white/5 bg-[#0F1629] relative z-10 space-y-8">
                    
                    {/* Filters Row */}
                    <div className="flex flex-wrap md:flex-nowrap gap-4 items-end bg-[#131A2D] p-3 rounded-2xl border border-white/5 shadow-inner">
                        <div className="flex-1 min-w-[170px]">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-2 flex items-center gap-1.5"><Calendar size={12}/> From Date & Time</label>
                            <input 
                                type="datetime-local" 
                                value={dateFrom} 
                                onChange={e => setDateFrom(e.target.value)} 
                                style={{ colorScheme: 'dark' }}
                                className="w-full bg-[#0B1221] border border-white/5 rounded-xl px-4 py-2.5 text-white text-sm font-semibold outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm cursor-pointer" 
                            />
                        </div>
                        <div className="flex-1 min-w-[170px]">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-2 flex items-center gap-1.5"><Calendar size={12}/> To Date & Time</label>
                            <input 
                                type="datetime-local" 
                                value={dateTo} 
                                onChange={e => setDateTo(e.target.value)} 
                                style={{ colorScheme: 'dark' }}
                                className="w-full bg-[#0B1221] border border-white/5 rounded-xl px-4 py-2.5 text-white text-sm font-semibold outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm cursor-pointer" 
                            />
                        </div>
                        <div className="flex-1 min-w-[150px]">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-2 flex items-center gap-1.5"><ShieldCheck size={12}/> Method</label>
                            <div className="relative">
                                <select value={verificationMethod} onChange={e => setVerificationMethod(e.target.value)} className="w-full bg-[#0B1221] border border-white/5 rounded-xl px-4 py-2.5 text-white text-sm font-semibold outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm cursor-pointer appearance-none">
                                    <option value="all">All Methods</option>
                                    <option value="ai">AI Verified</option>
                                    <option value="manual">Manual / Staff</option>
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">▼</div>
                            </div>
                        </div>
                        <div className="flex-1 min-w-[150px]">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-2 flex items-center gap-1.5"><Filter size={12}/> Status</label>
                            <div className="relative">
                                <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="w-full bg-[#0B1221] border border-white/5 rounded-xl px-4 py-2.5 text-white text-sm font-semibold outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm cursor-pointer appearance-none">
                                    <option value="all">All Actions</option>
                                    <option value="approved">All Approved</option>
                                    <option value="quick_approve">↳ Quick Approve</option>
                                    <option value="discount_approve">↳ Discount Approve</option>
                                    <option value="adjust_approve">↳ Adjust Approve</option>
                                    <option value="upgrade_approve">↳ Upgrade Approve</option>
                                    <option value="installment_approve">↳ Installment Approve</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">▼</div>
                            </div>
                        </div>
                        <button onClick={fetchStaffStats} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-2.5 px-8 rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] flex items-center justify-center gap-2 h-[42px] border border-white/10 active:scale-95">
                            <Search size={16} /> Fetch
                        </button>
                    </div>

                    {/* 4 Summary Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                        <div className="bg-gradient-to-br from-[#1A233A] to-[#131A2D] p-5 rounded-2xl border border-white/5 shadow-sm relative overflow-hidden group hover:border-slate-500/30 transition-all">
                            <div className="absolute right-4 top-4 text-slate-600/30 group-hover:text-slate-500/40 transition-colors transform group-hover:scale-110 duration-500"><BarChart3 size={60} strokeWidth={1}/></div>
                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-1 relative z-10">Total Actions</p>
                            <p className="text-4xl font-black text-white tracking-tight relative z-10">{summary.total}</p>
                        </div>
                        
                        <div className="bg-gradient-to-br from-blue-900/40 to-[#131A2D] p-5 rounded-2xl border border-blue-500/10 shadow-sm relative overflow-hidden group hover:border-blue-500/30 transition-all">
                            <div className="absolute right-4 top-4 text-blue-500/10 group-hover:text-blue-500/20 transition-colors transform group-hover:scale-110 duration-500"><Bot size={60} strokeWidth={1}/></div>
                            <p className="text-[11px] text-blue-400 font-bold uppercase tracking-widest mb-1 relative z-10 flex items-center gap-1.5"><Bot size={12}/> AI Verified</p>
                            <p className="text-4xl font-black text-white tracking-tight relative z-10">{summary.aiVerified}</p>
                        </div>
                        
                        <div className="bg-gradient-to-br from-emerald-900/40 to-[#131A2D] p-5 rounded-2xl border border-emerald-500/10 shadow-sm relative overflow-hidden group hover:border-emerald-500/30 transition-all">
                            <div className="absolute right-4 top-4 text-emerald-500/10 group-hover:text-emerald-500/20 transition-colors transform group-hover:scale-110 duration-500"><User size={60} strokeWidth={1}/></div>
                            <p className="text-[11px] text-emerald-400 font-bold uppercase tracking-widest mb-1 relative z-10 flex items-center gap-1.5"><CheckCircle size={12}/> Manual</p>
                            <p className="text-4xl font-black text-white tracking-tight relative z-10">{summary.manualVerified}</p>
                        </div>
                        
                        <div className="bg-gradient-to-br from-rose-900/40 to-[#131A2D] p-5 rounded-2xl border border-rose-500/10 shadow-sm relative overflow-hidden group hover:border-rose-500/30 transition-all">
                            <div className="absolute right-4 top-4 text-rose-500/10 group-hover:text-rose-500/20 transition-colors transform group-hover:scale-110 duration-500"><XCircle size={60} strokeWidth={1}/></div>
                            <p className="text-[11px] text-rose-400 font-bold uppercase tracking-widest mb-1 relative z-10 flex items-center gap-1.5"><XCircle size={12}/> Rejected</p>
                            <p className="text-4xl font-black text-white tracking-tight relative z-10">{summary.rejected}</p>
                        </div>
                    </div>

                    {/* Approval Breakdown */}
                    {(summary.quickApprove > 0 || summary.discountApprove > 0 || summary.adjustApprove > 0 || summary.upgradeApprove > 0 || summary.installmentApprove > 0) && (
                        <div className="space-y-3">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <CheckCircle size={14} className="text-emerald-400" /> Approval Breakdown (Total: {summary.quickApprove + summary.discountApprove + summary.adjustApprove + summary.upgradeApprove + summary.installmentApprove})
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                <div className="bg-[#131A2D] border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center gap-1 hover:border-emerald-500/30 transition-colors">
                                    <span className="text-2xl font-black text-white">{summary.quickApprove}</span>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Quick</span>
                                </div>
                                <div className="bg-[#131A2D] border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center gap-1 hover:border-emerald-500/30 transition-colors">
                                    <span className="text-2xl font-black text-white">{summary.discountApprove}</span>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Discount</span>
                                </div>
                                <div className="bg-[#131A2D] border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center gap-1 hover:border-emerald-500/30 transition-colors">
                                    <span className="text-2xl font-black text-white">{summary.adjustApprove}</span>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Adjust</span>
                                </div>
                                <div className="bg-[#131A2D] border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center gap-1 hover:border-emerald-500/30 transition-colors">
                                    <span className="text-2xl font-black text-white">{summary.upgradeApprove}</span>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Upgrade</span>
                                </div>
                                <div className="bg-[#131A2D] border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center gap-1 hover:border-emerald-500/30 transition-colors">
                                    <span className="text-2xl font-black text-white">{summary.installmentApprove}</span>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Installment</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Staff Leaderboard */}
                    {staffBreakdown.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Trophy size={14} className="text-amber-400" /> Staff Leaderboard
                            </h3>
                            <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-2 snap-x">
                                {staffBreakdown.map(([staffName, stats], idx) => {
                                    const percentage = Math.round((stats.total / maxStaffCount) * 100);
                                    return (
                                        <div key={staffName} className="snap-start flex-shrink-0 w-72 bg-[#131A2D] border border-white/5 rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden group hover:border-emerald-500/30 transition-all cursor-default">
                                            {idx === 0 && <div className="absolute -top-6 -right-6 w-16 h-16 bg-amber-500/20 blur-xl rounded-full"></div>}
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm border ${getAvatarColor(staffName)} shadow-inner`}>
                                                        {getInitials(staffName)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white leading-tight truncate w-32">{staffName}</p>
                                                        <p className="text-[10px] font-semibold text-slate-500 uppercase mt-0.5">Rank #{idx + 1}</p>
                                                    </div>
                                                </div>
                                                <span className="bg-emerald-500/10 text-emerald-400 text-lg font-black px-2.5 py-1 rounded-xl border border-emerald-500/20">
                                                    {stats.total}
                                                </span>
                                            </div>
                                            <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                                                <div 
                                                    className="h-full bg-emerald-500" 
                                                    style={{ width: `${percentage}%` }}
                                                ></div>
                                            </div>
                                            
                                            {/* Detailed Breakdown */}
                                            <div className="grid grid-cols-5 gap-1 mt-1 border-t border-white/5 pt-3">
                                                <div className="flex flex-col items-center justify-center" title="Quick Approve">
                                                    <span className="text-xs font-black text-white">{stats.quick}</span>
                                                    <span className="text-[8px] font-bold text-slate-500 uppercase mt-0.5">Qck</span>
                                                </div>
                                                <div className="flex flex-col items-center justify-center" title="Discount Approve">
                                                    <span className="text-xs font-black text-white">{stats.discount}</span>
                                                    <span className="text-[8px] font-bold text-slate-500 uppercase mt-0.5">Dis</span>
                                                </div>
                                                <div className="flex flex-col items-center justify-center" title="Adjust Approve">
                                                    <span className="text-xs font-black text-white">{stats.adjust}</span>
                                                    <span className="text-[8px] font-bold text-slate-500 uppercase mt-0.5">Adj</span>
                                                </div>
                                                <div className="flex flex-col items-center justify-center" title="Upgrade Approve">
                                                    <span className="text-xs font-black text-white">{stats.upgrade}</span>
                                                    <span className="text-[8px] font-bold text-slate-500 uppercase mt-0.5">Upg</span>
                                                </div>
                                                <div className="flex flex-col items-center justify-center" title="Installment Approve">
                                                    <span className="text-xs font-black text-white">{stats.installment}</span>
                                                    <span className="text-[8px] font-bold text-slate-500 uppercase mt-0.5">Inst</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Data Table Section */}
                <div className="flex-1 bg-[#090D18] relative z-10 overflow-hidden flex flex-col p-6">
                    <div className="flex-1 bg-[#111727] rounded-2xl border border-white/5 overflow-hidden flex flex-col shadow-inner">
                        {loading ? (
                            <div className="flex-1 flex flex-col items-center justify-center">
                                <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                                <p className="text-blue-400 font-bold tracking-wide">Syncing Records...</p>
                            </div>
                        ) : reportData.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                                <div className="w-20 h-20 bg-slate-800/50 rounded-3xl flex items-center justify-center mb-6 border border-white/5">
                                    <Filter size={32} className="text-slate-500" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">No Records Found</h3>
                                <p className="text-sm text-slate-500 max-w-sm">Try adjusting your filters or date range to find the verifications you're looking for.</p>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-[#161D2E] sticky top-0 z-20 shadow-sm border-b border-white/5">
                                        <tr>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Record ID</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Student Details</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Batch</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Action</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Verified By</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Timestamp</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {reportData.map((row) => (
                                            <tr key={row.id} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-bold text-slate-300">Log <span className="text-slate-500">#{row.id}</span></div>
                                                    <div className="text-[11px] font-semibold text-slate-500 uppercase mt-0.5 tracking-wider group-hover:text-blue-400/70 transition-colors">Pay #{row.paymentId}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-lg flex flex-shrink-0 items-center justify-center font-bold text-xs border ${getAvatarColor(row.studentName)}`}>
                                                            {getInitials(row.studentName)}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-white group-hover:text-blue-200 transition-colors">{row.studentName}</div>
                                                            <div className="text-[11px] font-medium text-slate-500 truncate max-w-[200px]">{row.business}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-block max-w-[180px] truncate text-sm font-medium text-slate-400 bg-black/20 px-2.5 py-1 rounded-md border border-white/5">
                                                        {row.batch}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {row.status === 1 ? (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)] uppercase whitespace-nowrap">
                                                            <CheckCircle size={12} strokeWidth={3}/> {row.approveType || 'APPROVED'}
                                                        </span>
                                                    ) : row.status === 2 ? (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/10 text-rose-400 text-[10px] font-bold border border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.1)] uppercase whitespace-nowrap">
                                                            <XCircle size={12} strokeWidth={3}/> REJECTED
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)] uppercase whitespace-nowrap">
                                                            <Bot size={12} strokeWidth={3}/> EDITED (STATUS: {row.status})
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {row.isAiVerified ? (
                                                        <div className="flex items-center gap-2 text-blue-400 font-bold text-sm bg-blue-500/5 px-3 py-1.5 rounded-xl border border-blue-500/10 w-fit">
                                                            <Bot size={14}/> System AI
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2 text-slate-300 font-bold text-sm bg-slate-800/50 px-3 py-1.5 rounded-xl border border-white/5 w-fit group-hover:border-slate-500/30 transition-colors">
                                                            <User size={14} className="text-slate-400"/>
                                                            {row.verifiedBy}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="text-sm font-bold text-slate-300 flex items-center justify-end gap-1.5">
                                                        <Clock size={12} className="text-slate-500"/>
                                                        {new Date(row.updatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                    </div>
                                                    <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
                                                        {new Date(row.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}