import React, { useState, useEffect } from 'react';
import axios from '../../../api/axios';
import toast from 'react-hot-toast';
import { Loader2, PhoneCall, CheckCircle2, AlertCircle, Award, CreditCard, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChartPie } from 'lucide-react';
import { FaSave, FaCommentDots, FaSearch, FaKeyboard, FaChartPie } from 'react-icons/fa';

export default function BridgeStaffExecution({ filters, setChatModalLead, externalSearch }) {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [drafts, setDrafts] = useState({});
    
    // UI States
    const [searchQuery, setSearchQuery] = useState('');
    const [activePhase, setActivePhase] = useState(1);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50; 
    const [typingMode, setTypingMode] = useState('en'); // Safely added to prevent crash

    const [sessionEnrolled, setSessionEnrolled] = useState({ total: 0, full: 0, monthly: 0, installment: 0 });
    
    // 🔥 New State: Collapse Stats to save screen space 🔥
    const [isStatsCollapsed, setIsStatsCollapsed] = useState(false);

    const currentUserId = JSON.parse(localStorage.getItem('user'))?.id;
    const rawRole = JSON.parse(localStorage.getItem('user'))?.role || '';
    const isManager = ['SYSTEM_ADMIN', 'DIRECTOR', 'MANAGER', 'SUPER'].includes(rawRole.toUpperCase().replace(/ /g, '_'));

    useEffect(() => {
        if (externalSearch) {
            setSearchQuery(externalSearch);
        }
    }, [externalSearch]);

    useEffect(() => {
        fetchBridgeCampaignLeads();
    }, [filters?.selectedBusiness, filters?.selectedBatch]);

    const fetchBridgeCampaignLeads = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/after-seminar-crm/leads', {
                headers: { Authorization: `Bearer ${token}` }, 
                params: {
                    tab: 'ASSIGNED',
                    loggedUserId: currentUserId,
                    loggedUserRole: rawRole,
                    businessId: filters?.selectedBusiness || '', 
                    batchId: filters?.selectedBatch || ''        
                }
            });
            
            const activeLeads = (res.data.leads || []).filter(l => l.source === 'bridge_transfer' && l.enrollmentStatus !== 'ENROLLED');
            setLeads(activeLeads);
            
            const loadedDrafts = {};
            activeLeads.forEach(l => {
                const savedDraft = localStorage.getItem(`draft_bridge_${l.id}`);
                if (savedDraft) loadedDrafts[l.id] = savedDraft;
            });
            setDrafts(loadedDrafts);
            setSessionEnrolled({ total: 0, full: 0, monthly: 0, installment: 0 });
        } catch (error) { 
            console.error(error); 
            toast.error("Failed to load bridge campaign leads"); 
        }
        setLoading(false);
    };

    const handleUpdateLocalLead = (id, field, value) => {
        setLeads(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
    };

    const handleSaveCallData = async (leadId) => {
        const lead = leads.find(l => l.id === leadId);
        const feedback = drafts[leadId] || '';
        
        try {
            const token = localStorage.getItem('token');
            await axios.post('/after-seminar-crm/leads/update-call', {
                leadId, 
                method: lead.callMethod || 'direct', 
                status: lead.callStatus || 'pending', 
                feedback,
                coordinationRound: lead.coordinationRound || 1,
                paymentIntention: lead.paymentIntention || 'NOT_DECIDED',
                enrollmentStatus: lead.enrollmentStatus || 'NON_ENROLLED'
            }, { headers: { Authorization: `Bearer ${token}` } });
            
            toast.success("Saved successfully!");
            
            if (lead.enrollmentStatus === 'ENROLLED') {
                setSessionEnrolled(prev => ({
                    total: prev.total + 1,
                    full: lead.paymentIntention === 'FULL' ? prev.full + 1 : prev.full,
                    monthly: lead.paymentIntention === 'MONTHLY' ? prev.monthly + 1 : prev.monthly,
                    installment: lead.paymentIntention === 'INSTALLMENT' ? prev.installment + 1 : prev.installment
                }));
                setLeads(prev => prev.filter(l => l.id !== leadId));
            } else {
                setLeads(prev => prev.map(l => {
                    if (l.id === leadId) {
                        let newPhase = l.phase;
                        if (lead.callStatus === 'no_answer') {
                            if (l.phase === 1) newPhase = 2;
                            else if (l.phase === 2) newPhase = 3;
                        }
                        return { ...l, callStatus: lead.callStatus, feedback: feedback, phase: newPhase };
                    }
                    return l;
                }));
            }
            
            const newDrafts = { ...drafts };
            delete newDrafts[leadId];
            setDrafts(newDrafts);
            localStorage.removeItem(`draft_bridge_${leadId}`);
        } catch (error) { toast.error("Failed to save data."); }
    };

    const phaseFilteredLeads = leads.filter(l => (l.phase || 1) === activePhase && (
        l.phone.includes(searchQuery) || (l.name && l.name.toLowerCase().includes(searchQuery.toLowerCase()))
    ));

    const sortedFilteredLeads = phaseFilteredLeads.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

    const totalPages = Math.ceil(sortedFilteredLeads.length / itemsPerPage);
    const paginatedLeads = sortedFilteredLeads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const totalAssigned = leads.length + sessionEnrolled.total;
    const covered = leads.filter(l => l.callStatus !== 'pending').length + sessionEnrolled.total;
    const pending = leads.filter(l => l.callStatus === 'pending' || !l.callStatus).length;
    const responseRate = totalAssigned > 0 ? Math.round((covered / totalAssigned) * 100) : 0;

    if (loading) return <div className="flex flex-col justify-center items-center h-full text-indigo-400 font-sans"><Loader2 className="animate-spin mb-4" size={32} /> Loading Execution Workspace...</div>;

    return (
        <div className="flex flex-col h-full space-y-4 font-sans text-slate-200 transition-colors duration-300">
            
            {/* 🔥 Collapsible Stats Section (Premium UI) 🔥 */}
            <div className="flex flex-col gap-4 shrink-0 mb-2">
                <div className="flex justify-between items-center bg-[#111827] px-6 py-4 rounded-2xl border border-slate-800 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-500/10 p-2 rounded-lg"><FaChartPie className="text-indigo-500 text-xl" /></div>
                        <h2 className="text-lg font-bold text-white tracking-wide">Bridge Execution Matrix</h2>
                    </div>
                    <button onClick={() => setIsStatsCollapsed(!isStatsCollapsed)} className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white bg-slate-900/50 px-4 py-2 rounded-xl transition-colors border border-slate-700">
                        {isStatsCollapsed ? <><ChevronDown size={14} /> Show Stats</> : <><ChevronUp size={14} /> Hide Stats</>}
                    </button>
                </div>

                {!isStatsCollapsed && (
                    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 flex flex-wrap lg:flex-nowrap gap-6 shadow-md animate-fade-in-up">
                        <div className="flex gap-8 border-r border-slate-700 pr-8">
                            <div>
                                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5"><PhoneCall size={12}/> Assigned</p>
                                <p className="text-2xl font-black text-white">{totalAssigned}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5"><CheckCircle2 size={12}/> Covered</p>
                                <p className="text-2xl font-black text-amber-400">{covered}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5"><AlertCircle size={12}/> Pending</p>
                                <p className="text-2xl font-black text-slate-300">{pending}</p>
                            </div>
                        </div>

                        <div className="flex flex-1 items-center justify-around gap-4 px-4">
                            <div className="text-center">
                                <p className="text-[11px] text-emerald-500 font-bold uppercase tracking-wider mb-1.5 flex items-center justify-center gap-1"><Award size={12}/> Enrolled (Paid)</p>
                                <p className="text-2xl font-black text-emerald-400">{sessionEnrolled.total}</p>
                            </div>
                            <div className="w-px h-8 bg-slate-700"></div>
                            <div className="flex flex-wrap lg:flex-nowrap gap-4 text-sm font-bold justify-center">
                                <span className="text-indigo-400 bg-indigo-500/10 px-4 py-1.5 rounded-lg border border-indigo-500/20">Full: {sessionEnrolled.full}</span>
                                <span className="text-blue-400 bg-blue-500/10 px-4 py-1.5 rounded-lg border border-blue-500/20">Monthly: {sessionEnrolled.monthly}</span>
                                <span className="text-amber-400 bg-amber-500/10 px-4 py-1.5 rounded-lg border border-amber-500/20">Install: {sessionEnrolled.installment}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Filters Bar (Premium UI) */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-black/20 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 shrink-0 shadow-sm mt-2">
                <div className="flex bg-slate-900/80 p-1.5 rounded-xl gap-1 w-full md:w-auto border border-slate-700 shadow-sm">
                    {[1, 2, 3].map(p => (
                        <button key={p} onClick={() => {setActivePhase(p); setCurrentPage(1);}} 
                            className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-xs font-black uppercase transition-all outline-none ${activePhase === p ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                            PHASE {p}
                        </button>
                    ))}
                </div>
                
                <div className="flex flex-wrap lg:flex-nowrap items-center gap-4 w-full md:w-auto">
                    <div className="flex items-center gap-2.5 mr-2">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest transition-colors">Rate: {responseRate}%</span>
                        <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden shadow-inner">
                            <div style={{width: `${responseRate}%`}} className="bg-indigo-500 h-full transition-all"></div>
                        </div>
                    </div>
                    
                    <div className="relative flex-1 min-w-[220px]">
                        <FaSearch className="absolute left-4 top-3 text-slate-500 text-sm" />
                        <input type="text" placeholder="Search Phone or Name..." value={searchQuery} onChange={(e) => {setSearchQuery(e.target.value); setCurrentPage(1);}} 
                            className="w-full bg-slate-900/80 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition-colors shadow-sm" />
                    </div>

                    <div className="relative w-24 shrink-0">
                        <FaKeyboard className="absolute left-3 top-3 text-slate-500 text-sm" />
                        <select value={typingMode} onChange={(e) => setTypingMode(e.target.value)} className="w-full bg-slate-900/80 border border-slate-700 rounded-xl py-2.5 pl-8 pr-2 text-[10px] font-bold uppercase tracking-wide text-white outline-none cursor-pointer focus:border-indigo-500 transition-all appearance-none">
                            <option value="en">ENG</option>
                            <option value="si-phonetic">SIN</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Leads List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pb-10 pr-2">
                {paginatedLeads.length === 0 ? (
                    <div className="flex flex-col justify-center items-center py-20 text-slate-500 bg-[#111827] rounded-[2rem] border border-slate-800 shadow-sm transition-colors mt-4">
                        <CheckCircle2 size={48} className="mb-4 opacity-30 text-emerald-500" />
                        <h3 className="text-lg font-bold text-slate-400 transition-colors">No leads found in Phase {activePhase}</h3>
                    </div>
                ) : (
                    paginatedLeads.map((lead, index) => {
                        const realIndex = (currentPage - 1) * itemsPerPage + index + 1;
                        const currentRemark = drafts[lead.id] !== undefined ? drafts[lead.id] : (lead.feedback || '');
                        const isPending = lead.callStatus === 'pending' || !lead.callStatus;
                        
                        const currentLeadDate = new Date(lead.roundProgress?.[0]?.updatedAt || lead.updatedAt || lead.createdAt).toLocaleDateString('en-CA');
                        const prevLeadDate = index > 0 ? new Date(paginatedLeads[index - 1].roundProgress?.[0]?.updatedAt || paginatedLeads[index - 1].updatedAt || paginatedLeads[index - 1].createdAt).toLocaleDateString('en-CA') : null;
                        const showDateHeader = currentLeadDate !== prevLeadDate;

                        const getDateHeader = (dateStr) => {
                            const date = new Date(dateStr);
                            const today = new Date();
                            const yesterday = new Date(today);
                            yesterday.setDate(yesterday.getDate() - 1);
                            if (date.toDateString() === today.toDateString()) return "📅 Today";
                            if (date.toDateString() === yesterday.toDateString()) return "📅 Yesterday";
                            return `📅 ${date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`;
                        };
                        
                        return (
                            <React.Fragment key={lead.id}>
                                {showDateHeader && (
                                    <div className="sticky top-0 z-10 bg-[#0f151c]/95 backdrop-blur-sm py-2 my-2 first:mt-0">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded bg-[#111827] border border-slate-800 text-slate-300 flex items-center gap-2">
                                                {getDateHeader(currentLeadDate)}
                                            </h3>
                                            <div className="h-px flex-1 bg-slate-800"></div>
                                        </div>
                                    </div>
                                )}

                                {/* 🔥 Premium Inner Lead Card UI 🔥 */}
                                <div className={`bg-[#111827] rounded-xl transition-all duration-200 overflow-hidden border ${isPending ? 'border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.05)]' : 'border-slate-800 hover:border-slate-700'} mb-3 p-5 flex flex-col xl:flex-row gap-6`}>
                                    
                                    {/* Info Column */}
                                    <div className="flex items-start gap-4 w-full xl:w-[260px] shrink-0 xl:border-r border-slate-800 pr-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shrink-0 shadow-inner ${isPending ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-slate-800 text-slate-300'}`}>
                                            {realIndex}
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <h4 className={`font-bold text-base tracking-wide ${isPending ? 'text-rose-400' : 'text-slate-100'}`}>{lead.phone}</h4>
                                            <p className="text-xs font-medium text-slate-400 truncate w-40">{lead.name || 'Unknown Student'}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="bg-slate-900 border border-slate-700 text-slate-400 px-2 py-0.5 rounded text-[9px] font-bold uppercase">Phase {lead.phase || 1}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Configs Column */}
                                    <div className="w-full xl:w-[200px] flex flex-col gap-2.5 shrink-0">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Enrollment</label>
                                            <select value={lead.enrollmentStatus || 'NON_ENROLLED'} onChange={(e) => handleUpdateLocalLead(lead.id, 'enrollmentStatus', e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-slate-300 text-[11px] font-semibold rounded-lg px-2 py-1.5 outline-none focus:border-indigo-500 cursor-pointer transition-colors">
                                                <option value="NON_ENROLLED">Non-Enrolled</option>
                                                <option value="ENROLLED">🔥 Enrolled (Paid)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Pay Plan</label>
                                            <select value={lead.paymentIntention || 'NOT_DECIDED'} onChange={(e) => handleUpdateLocalLead(lead.id, 'paymentIntention', e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-slate-300 text-[11px] font-semibold rounded-lg px-2 py-1.5 outline-none focus:border-indigo-500 cursor-pointer transition-colors">
                                                <option value="NOT_DECIDED">Not Decided</option>
                                                <option value="FULL">Full</option>
                                                <option value="MONTHLY">Monthly</option>
                                                <option value="INSTALLMENT">Installment</option>
                                            </select>
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Method</label>
                                                <select value={lead.callMethod || 'direct'} onChange={(e) => handleUpdateLocalLead(lead.id, 'callMethod', e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-slate-300 text-[11px] font-semibold rounded-lg px-2 py-1.5 outline-none focus:border-indigo-500 cursor-pointer transition-colors">
                                                    <option value="direct">Direct Call</option>
                                                    <option value="whatsapp">WhatsApp</option>
                                                    <option value="3cx">3CX</option>
                                                </select>
                                            </div>
                                            <div className="w-14 shrink-0">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Att.</label>
                                                <select value={lead.attemptCount || 1} onChange={(e) => handleUpdateLocalLead(lead.id, 'attemptCount', parseInt(e.target.value))} className="w-full bg-slate-900 border border-slate-700 text-slate-300 text-[11px] font-semibold rounded-lg px-1 py-1.5 outline-none text-center focus:border-indigo-500 cursor-pointer transition-colors">
                                                    {[1,2,3,4,5].map(r => <option key={r} value={r}>{r}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Remarks Column */}
                                    <div className="flex-1 flex flex-col">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex justify-between items-center">
                                            Call Remarks 
                                            {typingMode === 'si-phonetic' && <span className="text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded text-[9px] ml-2">SIN</span>}
                                        </label>
                                        <textarea 
                                            value={currentRemark} 
                                            onChange={(e) => { 
                                                setDrafts(prev => ({ ...prev, [lead.id]: e.target.value })); 
                                                localStorage.setItem(`draft_bridge_${lead.id}`, e.target.value); 
                                            }} 
                                            placeholder="Type comprehensive feedback..." 
                                            className="flex-1 w-full h-full min-h-[80px] bg-[#0b0e14] border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 outline-none resize-none custom-scrollbar focus:border-indigo-500 transition-colors" 
                                        />
                                    </div>

                                    {/* Actions Column */}
                                    <div className="w-full xl:w-[160px] flex flex-col justify-between shrink-0">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Call Status</label>
                                            <select 
                                                onChange={(e) => handleUpdateLocalLead(lead.id, 'callStatus', e.target.value)} 
                                                value={lead.callStatus || 'pending'} 
                                                className={`w-full text-[11px] font-bold uppercase tracking-wide rounded-lg px-2 py-2 outline-none border transition-colors cursor-pointer shadow-sm ${isPending ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : lead.callStatus === 'answered' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : lead.callStatus === 'no_answer' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : lead.callStatus === 'reject' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-slate-900 text-slate-300 border-slate-700'}`}
                                            >
                                                <option className="bg-slate-900 text-slate-300" value="pending">⏳ PENDING</option>
                                                <option className="bg-slate-900 text-emerald-400" value="answered">✅ ANSWERED</option>
                                                <option className="bg-slate-900 text-amber-400" value="no_answer">📵 NO ANSWER</option>
                                                <option className="bg-slate-900 text-rose-400" value="reject">❌ REJECTED</option>
                                            </select>
                                        </div>

                                        <div className="flex gap-2 mt-auto pt-3">
                                            <button onClick={() => handleSaveCallData(lead.id)} className="flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 text-[11px] font-black uppercase tracking-wider transition-transform bg-indigo-600 hover:bg-indigo-500 text-white shadow-md hover:scale-[1.02] outline-none">
                                                <FaSave size={12}/> SAVE
                                            </button>
                                            <button onClick={(e) => { e.preventDefault(); if(typeof setChatModalLead === 'function') setChatModalLead(lead); }} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 rounded-lg transition-colors relative flex justify-center items-center border border-slate-700 outline-none">
                                                <FaCommentDots size={14}/>
                                                {lead.unreadCount > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-[#111827]"></span>}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </React.Fragment>
                        );
                    })
                )}
            </div>

            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 py-6 border-t border-slate-800 mt-auto shrink-0 transition-colors">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-5 py-2.5 rounded-lg bg-[#111827] border border-slate-800 text-slate-300 text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors outline-none">Previous</button>
                    <span className="text-xs font-bold text-slate-400 bg-[#111827] px-4 py-2 rounded-lg border border-slate-800">Page <span className="text-white">{currentPage}</span> of {totalPages}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-indigo-500 transition-colors shadow-md outline-none">Next Page</button>
                </div>
            )}
        </div>
    );
}