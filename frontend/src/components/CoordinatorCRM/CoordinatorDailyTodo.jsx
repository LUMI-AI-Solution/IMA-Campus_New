import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { 
    CheckCircle, PhoneCall, MessageSquare, AlertCircle, PhoneOff, 
    ChevronRight, Activity, Zap, Star, Clock, Users, X, Search, ExternalLink 
} from 'lucide-react';

const CoordinatorDailyTodo = ({ staffId, isManager = false, selectedBusiness, selectedBatch }) => {
    const [todoData, setTodoData] = useState([]);
    const [loading, setLoading] = useState(true);

    // After Seminar CRM Chat Summary & Coordinator Breakdown State
    const [afterSemSummary, setAfterSemSummary] = useState({
        totalUnread: 0,
        expiringSoon: 0,
        expired: 0,
        active: 0,
        coordinators: []
    });
    const [showAfterSemModal, setShowAfterSemModal] = useState(false);
    const [breakdownSearch, setBreakdownSearch] = useState('');

    useEffect(() => {
        const fetchTodoStats = async () => {
            try {
                const token = localStorage.getItem('token');
                const [todoRes, summaryRes] = await Promise.allSettled([
                    axios.get('/coordinator-crm/master-todo-stats', {
                        headers: { Authorization: `Bearer ${token}` },
                        params: {
                            businessId: selectedBusiness || 'ALL',
                            batchId: selectedBatch || 'ALL'
                        }
                    }),
                    axios.get('/coordinator-crm/after-seminar-chat-summary', {
                        headers: { Authorization: `Bearer ${token}` },
                        params: {
                            businessId: selectedBusiness || 'ALL',
                            batchId: selectedBatch || 'ALL'
                        }
                    })
                ]);
                
                if (todoRes.status === 'fulfilled') {
                    let data = todoRes.value.data;
                    if (staffId && !isManager) {
                        data = data.filter(d => d.id === parseInt(staffId));
                    }
                    setTodoData(data);
                }

                if (summaryRes.status === 'fulfilled' && summaryRes.value.data) {
                    setAfterSemSummary(summaryRes.value.data);
                }
            } catch (err) {
                console.error("Failed to fetch Master Todo Stats", err);
            } finally {
                setLoading(false);
            }
        };

        fetchTodoStats();
        // Every 2 minutes, and only while this tab is on screen (was every 30 s on every open tab).
        const interval = setInterval(() => { if (!document.hidden) fetchTodoStats(); }, 120000);
        return () => clearInterval(interval);
    }, [staffId, isManager, selectedBusiness, selectedBatch]);

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="relative flex items-center justify-center">
                    <div className="absolute animate-ping w-16 h-16 rounded-full bg-emerald-500/20"></div>
                    <div className="relative w-8 h-8 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
                </div>
            </div>
        );
    }

    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    const displayTodoData = todoData.length > 0 ? todoData : [{
        id: staffId || storedUser?.id || 1,
        name: storedUser?.firstName ? `${storedUser.firstName} ${storedUser.lastName || ''}`.trim() : 'Coordinator',
        freeSemPending: 0,
        openSemPending: 0,
        newInqR1Pending: 0,
        newInqR2Pending: 0,
        newInqR1NoAnswer: 0,
        newInqR2NoAnswer: 0,
        unreadChats: 0
    }];

    const filteredCoordinators = (afterSemSummary.coordinators || []).filter(c => {
        if (!breakdownSearch) return true;
        return (c.name || '').toLowerCase().includes(breakdownSearch.toLowerCase()) || String(c.id).includes(breakdownSearch);
    });

    const GlassCard = ({ title, value, icon, colorClass, highlight = false, isAlert = false }) => {
        const colors = {
            amber: 'from-amber-500/20 to-orange-500/5 border-amber-500/30 text-amber-400 shadow-amber-500/10',
            cyan: 'from-cyan-500/20 to-blue-500/5 border-cyan-500/30 text-cyan-400 shadow-cyan-500/10',
            emerald: 'from-emerald-500/20 to-teal-500/5 border-emerald-500/30 text-emerald-400 shadow-emerald-500/10',
            fuchsia: 'from-fuchsia-500/20 to-pink-500/5 border-fuchsia-500/30 text-fuchsia-400 shadow-fuchsia-500/10',
            purple: 'from-purple-500/20 to-indigo-500/5 border-purple-500/30 text-purple-400 shadow-purple-500/10',
            rose: 'from-rose-500/20 to-red-500/5 border-rose-500/30 text-rose-400 shadow-rose-500/10',
            slate: 'from-slate-800/50 to-slate-900/50 border-slate-700 text-slate-400 shadow-none'
        };

        const activeColor = value > 0 ? colors[colorClass] : colors.slate;
        
        return (
            <div className={`relative overflow-hidden group rounded-2xl border p-5 flex flex-col justify-between transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl ${activeColor} bg-gradient-to-br backdrop-blur-md`}>
                {/* Glow effect */}
                {value > 0 && highlight && (
                    <div className={`absolute -inset-1 rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity bg-gradient-to-r ${colorClass === 'emerald' ? 'from-emerald-400 to-teal-400' : 'from-current to-transparent'}`}></div>
                )}
                
                <div className="relative z-10 flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl backdrop-blur-md border ${value > 0 ? `border-${colorClass}-500/30 bg-${colorClass}-500/10` : 'border-slate-700 bg-slate-800/50'}`}>
                            {icon}
                        </div>
                        <span className={`text-xs font-bold uppercase tracking-widest ${value > 0 ? 'text-white' : 'text-slate-500'}`}>
                            {title}
                        </span>
                    </div>
                    {isAlert && value > 0 && (
                        <span className="relative flex h-3 w-3">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-${colorClass}-400`}></span>
                            <span className={`relative inline-flex rounded-full h-3 w-3 bg-${colorClass}-500`}></span>
                        </span>
                    )}
                </div>
                
                <div className="relative z-10 flex items-end justify-between">
                    <div className="flex items-baseline gap-1">
                        <span className={`text-4xl font-black tracking-tighter ${value > 0 ? 'text-white drop-shadow-md' : 'text-slate-600'}`}>
                            {value}
                        </span>
                        {value > 0 && <span className="text-xs font-semibold opacity-70 ml-1">PENDING</span>}
                    </div>
                    
                    {value > 0 && (
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                            <ChevronRight size={16} className="opacity-50 group-hover:opacity-100 transition-opacity group-hover:translate-x-1 duration-300" />
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-8 w-full animate-fade-in mb-10">
            {isManager && (
                <div className="flex items-center gap-4 bg-gradient-to-r from-fuchsia-600/20 to-purple-600/5 p-4 rounded-2xl border border-fuchsia-500/20">
                    <div className="bg-fuchsia-500 p-2 rounded-lg shadow-[0_0_20px_rgba(217,70,239,0.4)]">
                        <Activity className="text-white" size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-white tracking-widest uppercase">Master Action Dashboard</h2>
                        <p className="text-fuchsia-300/70 text-xs font-semibold tracking-wide">Live tracking of all coordinator pending tasks</p>
                    </div>
                </div>
            )}
            
            <div className={`grid gap-8 ${isManager ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'}`}>
                {displayTodoData.map(coord => {
                    const totalPending = coord.freeSemPending + coord.openSemPending + coord.newInqR1Pending + coord.newInqR2Pending + coord.newInqR1NoAnswer + coord.newInqR2NoAnswer + coord.unreadChats;
                    
                    return (
                        <div key={coord.id} className="relative bg-[#0f172a]/80 backdrop-blur-2xl rounded-3xl overflow-hidden border border-slate-700/50 shadow-2xl transition-all duration-500 hover:border-slate-600/80">
                            
                            {/* Decorative background element */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-emerald-500/5 to-transparent rounded-bl-full pointer-events-none"></div>

                            {/* Header */}
                            <div className="p-6 border-b border-slate-700/50 flex justify-between items-center relative z-10">
                                <div className="flex items-center gap-5">
                                    <div className="relative">
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-600 p-[2px] shadow-lg shadow-emerald-500/20">
                                            <div className="w-full h-full bg-[#0f172a] rounded-[14px] flex items-center justify-center text-white font-black text-2xl">
                                                {coord.name.charAt(0)}
                                            </div>
                                        </div>
                                        {totalPending > 0 && (
                                            <div className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-black px-2 py-1 rounded-lg border border-rose-400 shadow-md">
                                                ACTION
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-white tracking-wide">{coord.name}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                            <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Live Status</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="bg-slate-900/80 border border-slate-700 px-5 py-3 rounded-2xl flex flex-col items-center min-w-[120px] shadow-inner">
                                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1 flex items-center gap-1">
                                        <Zap size={10} className="text-amber-400" /> Total Pending
                                    </span>
                                    <span className={`text-3xl font-black ${totalPending > 0 ? 'text-white' : 'text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]'}`}>
                                        {totalPending}
                                    </span>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 relative z-10 bg-slate-900/20">
                                
                                {/* 🎯 1ST TILE: AFTER SEMINAR CRM SUMMARY 🎯 */}
                                <div 
                                    onClick={() => setShowAfterSemModal(true)}
                                    className={`relative overflow-hidden group rounded-2xl border p-5 flex flex-col justify-between transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl cursor-pointer ${
                                        afterSemSummary.totalUnread > 0 
                                            ? 'from-purple-500/20 via-indigo-500/10 to-slate-900/60 border-purple-500/30 text-purple-300 shadow-purple-500/10' 
                                            : 'from-slate-800/50 to-slate-900/50 border-slate-700 text-slate-400 shadow-none'
                                    } bg-gradient-to-br backdrop-blur-md`}
                                >
                                    {/* Ambient Glow */}
                                    {afterSemSummary.totalUnread > 0 && (
                                        <div className="absolute -inset-1 rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity bg-gradient-to-r from-purple-500 to-indigo-500 pointer-events-none"></div>
                                    )}

                                    {/* Header */}
                                    <div className="relative z-10 flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2.5">
                                            <div className={`p-2.5 rounded-xl backdrop-blur-md border ${
                                                afterSemSummary.totalUnread > 0 
                                                    ? 'border-purple-500/40 bg-purple-500/20 text-purple-300 shadow-lg shadow-purple-500/20' 
                                                    : 'border-slate-700 bg-slate-800/50 text-slate-400'
                                            }`}>
                                                <MessageSquare size={18} />
                                            </div>
                                            <div>
                                                <span className={`text-xs font-black uppercase tracking-wider block ${
                                                    afterSemSummary.totalUnread > 0 ? 'text-white' : 'text-slate-400'
                                                }`}>
                                                    After Seminar CRM
                                                </span>
                                                <span className="text-[10px] text-purple-300/70 font-semibold block">
                                                    WhatsApp Inquiries
                                                </span>
                                            </div>
                                        </div>

                                        {afterSemSummary.totalUnread > 0 && (
                                            <span className="relative flex h-3 w-3">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-purple-400"></span>
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
                                            </span>
                                        )}
                                    </div>

                                    {/* Unread Chats & Expiring Soon Row */}
                                    <div className="relative z-10 mt-2">
                                        <div className="flex items-baseline gap-2">
                                            <span className={`text-4xl font-black tracking-tighter ${
                                                afterSemSummary.totalUnread > 0 ? 'text-white drop-shadow-md' : 'text-slate-600'
                                            }`}>
                                                {afterSemSummary.totalUnread}
                                            </span>
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                                Unread Chats
                                            </span>
                                        </div>

                                        {/* Expiring Soon Indicator */}
                                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                            {afterSemSummary.expiringSoon > 0 ? (
                                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 shadow-sm animate-pulse">
                                                    <Clock size={11} className="text-amber-400" />
                                                    <span>{afterSemSummary.expiringSoon} Expiring Soon (&lt;4h)</span>
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-slate-400 bg-slate-800/80 border border-slate-700/60 flex items-center gap-1">
                                                    <Clock size={11} className="text-slate-500" />
                                                    <span>0 Expiring Soon</span>
                                                </span>
                                            )}

                                            {afterSemSummary.expired > 0 && (
                                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-rose-300 bg-rose-500/20 border border-rose-500/30 flex items-center gap-1">
                                                    <span>{afterSemSummary.expired} Expired</span>
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Footer: Coordinator Breakdown Button */}
                                    <div className="relative z-10 mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowAfterSemModal(true);
                                            }}
                                            className="w-full py-1.5 px-2.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/30 border border-purple-500/30 text-purple-200 hover:text-white text-[11px] font-black tracking-wide flex items-center justify-between transition-all cursor-pointer group/btn"
                                            title="View Coordinator-wise Breakdown"
                                        >
                                            <span className="flex items-center gap-1.5">
                                                <Users size={12} className="text-purple-400" />
                                                <span>Coordinator Breakdown</span>
                                                <span className="px-1.5 py-0.2 rounded-md bg-purple-500/40 text-[9px] text-purple-200 font-bold ml-0.5">
                                                    {afterSemSummary.coordinators?.length || 0}
                                                </span>
                                            </span>
                                            <ChevronRight size={13} className="group-hover/btn:translate-x-0.5 transition-transform text-purple-400" />
                                        </button>
                                    </div>
                                </div>
                                
                                <GlassCard 
                                    title="Free Seminar" 
                                    value={coord.freeSemPending} 
                                    icon={<PhoneCall size={18} />} 
                                    colorClass="cyan" 
                                    highlight={true}
                                />

                                <GlassCard 
                                    title="Unread Chats" 
                                    value={coord.unreadChats} 
                                    icon={<MessageSquare size={18} />} 
                                    colorClass="emerald" 
                                    highlight={true}
                                    isAlert={true}
                                />

                                <GlassCard 
                                    title="New Inq (R1)" 
                                    value={coord.newInqR1Pending} 
                                    icon={<PhoneCall size={18} />} 
                                    colorClass="fuchsia" 
                                    highlight={true}
                                />
                                
                                <GlassCard 
                                    title="New Inq (R2)" 
                                    value={coord.newInqR2Pending} 
                                    icon={<PhoneCall size={18} />} 
                                    colorClass="purple" 
                                    highlight={true}
                                />
                                
                                <GlassCard 
                                    title="R1 Unanswered" 
                                    value={coord.newInqR1NoAnswer} 
                                    icon={<PhoneOff size={18} />} 
                                    colorClass="rose" 
                                />
                                
                                <GlassCard 
                                    title="R2 Unanswered" 
                                    value={coord.newInqR2NoAnswer} 
                                    icon={<PhoneOff size={18} />} 
                                    colorClass="rose" 
                                />

                                {/* Empty placeholder for visual balance if needed, or an extra metric */}
                                <div className="hidden lg:flex flex-col items-center justify-center p-5 rounded-2xl border border-slate-800/50 bg-slate-900/30 text-slate-600 border-dashed">
                                    <Star size={24} className="mb-2 opacity-30" />
                                    <span className="text-xs font-bold uppercase tracking-widest text-center">Clear tasks to<br/>earn stars</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Coordinator-wise Breakdown Modal for After Seminar CRM */}
            {showAfterSemModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-[#0f172a] border border-purple-500/30 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col text-white max-h-[85vh] relative animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-5 px-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-purple-900/40 via-indigo-900/20 to-slate-900/40">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-300 flex items-center justify-center border border-purple-500/40 shadow-lg shadow-purple-500/20">
                                    <Users size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-white tracking-wide flex items-center gap-2">
                                        After Seminar CRM - Coordinator Breakdown
                                    </h3>
                                    <p className="text-xs text-slate-400 font-medium">
                                        Live monitor of unread inquiries & 24h WhatsApp response windows
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowAfterSemModal(false)}
                                className="text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-xl transition-all cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Top KPI Summary Bar */}
                        <div className="p-4 px-6 bg-slate-900/60 border-b border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex flex-col">
                                <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">Total Unread</span>
                                <span className="text-xl font-black text-white mt-0.5">{afterSemSummary.totalUnread}</span>
                            </div>
                            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col">
                                <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                                    <Clock size={10} /> Expiring Soon (&lt;4h)
                                </span>
                                <span className="text-xl font-black text-amber-400 mt-0.5">{afterSemSummary.expiringSoon}</span>
                            </div>
                            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex flex-col">
                                <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wider">Expired (&gt;24h)</span>
                                <span className="text-xl font-black text-rose-400 mt-0.5">{afterSemSummary.expired}</span>
                            </div>
                            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col">
                                <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">Active Window</span>
                                <span className="text-xl font-black text-emerald-400 mt-0.5">{afterSemSummary.active}</span>
                            </div>
                        </div>

                        {/* Search Filter */}
                        <div className="p-4 px-6 border-b border-white/5 bg-slate-900/30 flex items-center gap-3">
                            <div className="relative flex-1">
                                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={breakdownSearch}
                                    onChange={(e) => setBreakdownSearch(e.target.value)}
                                    placeholder="Search coordinator by name..."
                                    className="w-full pl-9 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
                                />
                            </div>
                            {breakdownSearch && (
                                <button
                                    type="button"
                                    onClick={() => setBreakdownSearch('')}
                                    className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-400 cursor-pointer"
                                >
                                    Clear
                                </button>
                            )}
                        </div>

                        {/* Coordinator List */}
                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-2.5">
                            {filteredCoordinators.length === 0 ? (
                                <div className="text-center py-12 text-slate-500 text-sm font-medium">
                                    No coordinators found matching "{breakdownSearch}".
                                </div>
                            ) : (
                                filteredCoordinators.map((c) => (
                                    <div
                                        key={c.id}
                                        className="p-3.5 rounded-2xl bg-slate-800/40 hover:bg-slate-800/70 border border-white/5 hover:border-purple-500/30 transition-all flex flex-wrap items-center justify-between gap-3"
                                    >
                                        <div className="flex items-center gap-3 min-w-[200px]">
                                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 p-[1.5px] shrink-0">
                                                <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center font-black text-xs text-purple-300 uppercase">
                                                    {c.name.charAt(0)}
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-bold text-white tracking-wide">{c.name}</h4>
                                                <span className="text-[10px] text-slate-400">
                                                    {c.id === 0 ? 'Unassigned Inquiries' : `Staff ID #${c.id}`}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {/* Unread badge */}
                                            <span className="px-2.5 py-1 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-200 text-xs font-black">
                                                {c.unreadCount} Unread
                                            </span>

                                            {/* Expiring Soon badge */}
                                            {c.expiringSoon > 0 ? (
                                                <span className="px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black flex items-center gap-1 animate-pulse">
                                                    <Clock size={11} /> {c.expiringSoon} Expiring Soon
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 rounded-xl bg-slate-800 text-slate-500 text-[11px] font-bold">
                                                    0 Expiring
                                                </span>
                                            )}

                                            {/* Expired badge */}
                                            {c.expired > 0 && (
                                                <span className="px-2 py-1 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] font-bold">
                                                    {c.expired} Expired
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 px-6 bg-slate-900/60 border-t border-white/5 flex items-center justify-between gap-3">
                            <span className="text-xs text-slate-400 font-medium">
                                Showing {filteredCoordinators.length} of {afterSemSummary.coordinators?.length || 0} coordinators
                            </span>
                            <div className="flex items-center gap-2">
                                <a
                                    href="/workspace/after-seminar-crm"
                                    className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition-all flex items-center gap-1.5 shadow-md shadow-purple-600/30 cursor-pointer"
                                >
                                    <span>Open After Seminar CRM</span>
                                    <ExternalLink size={13} />
                                </a>
                                <button
                                    type="button"
                                    onClick={() => setShowAfterSemModal(false)}
                                    className="px-4 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CoordinatorDailyTodo;
