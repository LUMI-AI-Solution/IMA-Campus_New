import React, { useState, useEffect, useMemo } from 'react';
import axios from '../../../api/axios';
import toast from 'react-hot-toast';
import { Loader2, Users, TrendingDown, TrendingUp, CalendarDays, RefreshCw } from 'lucide-react';
import { FaChevronLeft, FaChevronRight, FaSearch, FaFilter, FaCheckCircle, FaClock, FaExclamationTriangle } from 'react-icons/fa';
import PaidLeadCard from './PaidLeadCard';

const singlishToSinhala = (text) => {
    if (!text) return text;
    let s = text;
    const multiConsonants = { 'nnd': 'ඬ', 'nng': 'ඟ', 'mbb': 'ඹ', 'th': 'ත', 'Th': 'ථ', 'dh': 'ධ', 'Dh': 'ඪ', 'ch': 'ච', 'Ch': 'ඡ', 'ph': 'ඵ', 'bh': 'භ', 'sh': 'ශ', 'Sh': 'ෂ', 'gn': 'ඥ', 'kn': 'ඞ', 'ndh': 'න්ධ' };
    const singleConsonants = { 'k': 'ක', 'g': 'ග', 't': 'ට', 'd': 'ඩ', 'p': 'ප', 'b': 'බ', 'm': 'ම', 'n': 'න', 's': 'ස', 'h': 'හ', 'l': 'ල', 'r': 'ර', 'w': 'ව', 'v': 'ව', 'y': 'ය', 'j': 'ජ', 'c': 'ක', 'f': 'ෆ', 'x': 'ක්ෂ', 'z': 'ස', 'T': 'ඨ', 'D': 'ඪ', 'N': 'ණ', 'L': 'ළ', 'G': 'ඝ', 'R': 'ඍ', 'K': 'ඛ', 'P': 'ඵ', 'B': 'භ', 'M': 'ඹ', 'Y': 'ය', 'W': 'ව' };
    const vowels = { 'aa': { s: 'ා', iso: 'ආ' }, 'ae': { s: 'ැ', iso: 'ඇ' }, 'aee': { s: 'ෑ', iso: 'ඈ' }, 'a': { s: '', iso: 'අ' }, 'ii': { s: 'ී', iso: 'ඊ' }, 'i': { s: 'ි', iso: 'ඉ' }, 'uu': { s: 'ූ', iso: 'ඌ' }, 'u': { s: 'ු', iso: 'උ' }, 'oo': { s: 'ෝ', iso: 'ඕ' }, 'o': { s: 'ො', iso: 'ඔ' }, 'ou': { s: 'ෞ', iso: 'ඖ' }, 'ei': { s: 'ෛ', iso: 'ඓ' }, 'ee': { s: 'ේ', iso: 'ඒ' }, 'ea': { s: 'ේ', iso: 'ඒ' }, 'e': { s: 'ෙ', iso: 'එ' }, 'I': { s: 'ෛ', iso: 'ඓ' }, 'O': { s: 'ෞ', iso: 'ඖ' } };
    for (let v in vowels) s = s.replace(new RegExp(`(^|\\s)${v}`, 'g'), `$1${vowels[v].iso}`);
    for (let c in multiConsonants) { for (let v in vowels) s = s.replace(new RegExp(c + v, 'g'), multiConsonants[c] + vowels[v].s); s = s.replace(new RegExp(c, 'g'), multiConsonants[c] + '්'); }
    for (let c in singleConsonants) { for (let v in vowels) s = s.replace(new RegExp(c + v, 'g'), singleConsonants[c] + vowels[v].s); s = s.replace(new RegExp(c, 'g'), singleConsonants[c] + '්'); }
    s = s.replace(/ර්‍ර/g, '්‍ර'); s = s.replace(/්්/g, '්'); 
    return s;
};

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

const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

export default function AfterSeminarPaidCampaign({ filters, setChatModalLead, externalSearch }) {
    const currentUserId = JSON.parse(localStorage.getItem('user'))?.id;

    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [drafts, setDrafts] = useState({});

    // BACKEND REAL STATS
    const [retentionStats, setRetentionStats] = useState({
        prevMonthEnrolled: 0,
        thisMonthRenewed: 0,
        thisMonthDropped: 0
    });

    // FILTERS & NAVIGATION
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1 to 12
    const [activeMainTab, setActiveMainTab] = useState('MONTHLY'); // FULL, MONTHLY, INSTALLMENT
    const [activeSubTab, setActiveSubTab] = useState('NON_ENROLLED'); // ENROLLED, NON_ENROLLED
    
    const [activeRound, setActiveRound] = useState(1); 
    const [activePhase, setActivePhase] = useState(1);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [typingMode, setTypingMode] = useState('en');
    const [showOnlyDelayed, setShowOnlyDelayed] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [lastSearched, setLastSearched] = useState(null);

    // Limit displayed leads to preserve rendering performance
    const [displayLimit, setDisplayLimit] = useState(36);

    // Reset display limit and scroll when tab or filters change
    useEffect(() => {
        setDisplayLimit(36);
    }, [activeMainTab, activeSubTab, activeRound, activePhase, statusFilter, showOnlyDelayed, selectedMonth]);

    // Auto Redirect & Auto Tab Switch on external search
    useEffect(() => {
        if (externalSearch && externalSearch !== lastSearched && leads.length > 0) {
            const query = typeof externalSearch === 'object' ? externalSearch.phone : externalSearch;
            setSearchQuery(query);

            const targetLead = leads.find(l => l.phone === query || String(l.id) === String(query));
            if (targetLead) {
                if (['FULL', 'MONTHLY', 'INSTALLMENT'].includes(targetLead.paymentIntention)) {
                    setActiveMainTab(targetLead.paymentIntention);
                }
                if (targetLead.enrollmentStatus && targetLead.paymentIntention !== 'FULL') {
                    setActiveSubTab(targetLead.enrollmentStatus);
                }
                if (targetLead.coordinationRound) setActiveRound(targetLead.coordinationRound);
                if (targetLead.phase) setActivePhase(targetLead.phase);
                if (targetLead.callStatus) setStatusFilter(targetLead.callStatus);
                
                setLastSearched(externalSearch);
            }
        }
    }, [externalSearch, leads, lastSearched]);

    useEffect(() => {
        if (filters.selectedBusiness && filters.selectedBatch) {
            fetchPaidCampaignData();
        } else {
            setLeads([]);
            setLoading(false);
        }
    }, [filters, selectedMonth]);

    // API CALL - FETCH PAID CAMPAIGN DATA & STATS
    const fetchPaidCampaignData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/after-seminar-crm/retention/campaign-data', {
                headers: { Authorization: `Bearer ${token}` },
                params: { 
                    businessId: filters.selectedBusiness, 
                    batchId: filters.selectedBatch,
                    month: selectedMonth
                }
            });
            
            const myLeads = (res.data.leads || []).filter(l => l.assignedTo === currentUserId);
            setLeads(myLeads);

            if (res.data.stats) {
                setRetentionStats({
                    prevMonthEnrolled: res.data.stats.prevMonthEnrolled || 0,
                    thisMonthRenewed: res.data.stats.thisMonthRenewed || 0,
                    thisMonthDropped: res.data.stats.thisMonthDropped || 0
                });
            }

            const loadedDrafts = {};
            myLeads.forEach(l => {
                const savedDraft = localStorage.getItem(`draft_paid_remark_${l.id}`);
                if (savedDraft) loadedDrafts[l.id] = savedDraft;
            });
            setDrafts(loadedDrafts);
        } catch (error) {
            toast.error("Failed to load campaign data");
        }
        setLoading(false);
    };

    const handleUpdateLocalLead = (id, field, value) => {
        setLeads(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
    };

    const handleLocalCallStatusChange = (lead, newStatus) => {
        setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, callStatus: newStatus } : l));
    };

    const handleRemarkTyping = (leadId, value) => {
        let finalValue = value;
        if (typingMode === 'si-phonetic') {
            const words = value.split(' ');
            const lastWord = words.pop();
            if (!/\d/.test(lastWord) && lastWord.length > 0) {
                finalValue = [...words, singlishToSinhala(lastWord)].join(' ');
            }
        }
        setDrafts(prev => ({ ...prev, [leadId]: finalValue }));
        localStorage.setItem(`draft_paid_remark_${leadId}`, finalValue);
    };

    const handleStartRoundTwo = async () => {
        if (!filters.selectedBatch) return;
        if (!window.confirm("Are you sure you want to trigger Round 2? This will clone Round 1 answered and rejected leads of this batch and copy their remarks over as fresh Round 2 leads.")) return;
        
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/after-seminar-crm/retention/start-round-two', {
                businessId: filters.selectedBusiness,
                batchId: filters.selectedBatch
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            toast.success(res.data.message || "Round 2 started successfully!");
            fetchPaidCampaignData();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.error || "Failed to start Round 2 campaign.");
        }
    };

    const handleSaveCallData = async (leadId, exactCallStatus) => {
        const lead = leads.find(l => l.id === leadId);
        const feedback = drafts[leadId] || '';
        
        try {
            const token = localStorage.getItem('token');
            await axios.post('/after-seminar-crm/leads/update-call', {
                leadId, 
                method: lead.callMethod || 'direct', 
                status: exactCallStatus || lead.callStatus || 'pending', 
                feedback,
                coordinationRound: activeRound,
                phase: (exactCallStatus || lead.callStatus) === 'no_answer' ? Math.min(3, activePhase + 1) : activePhase,
                paymentIntention: lead.paymentIntention,
                enrollmentStatus: lead.enrollmentStatus,
                targetMonth: selectedMonth
            }, { headers: { Authorization: `Bearer ${token}` } });
            
            toast.success("Call updates saved!");
            
            if ((exactCallStatus || lead.callStatus) === 'no_answer' && activePhase < 3) {
                setLeads(prev => prev.filter(l => l.id !== leadId));
            } else {
                setLeads(prev => prev.map(l => l.id === leadId ? { ...l, phase: activePhase, feedback } : l));
            }

            const newDrafts = { ...drafts };
            delete newDrafts[leadId];
            setDrafts(newDrafts);
            localStorage.removeItem(`draft_paid_remark_${leadId}`);
            
            // Re-fetch retention metrics to update dashboard stats immediately
            fetchPaidCampaignData();
        } catch (error) { 
            toast.error("Failed to save data."); 
        }
    };

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
        return leads.filter(l => {
            const matchIntention = l.paymentIntention === activeMainTab;
            const matchStatus = activeMainTab === 'FULL' ? true : l.enrollmentStatus === activeSubTab;
            const matchRound = (l.coordinationRound || 1) === activeRound;
            const matchPhase = (l.phase || 1) === activePhase;
            
            let matchCallStatus = true;
            if (statusFilter !== 'ALL') {
                matchCallStatus = statusFilter === 'pending' ? (!l.callStatus || l.callStatus === 'pending') : l.callStatus === statusFilter;
            }

            let matchDelayed = true;
            if (showOnlyDelayed) {
                matchDelayed = checkIsLate(l);
            }

            const matchSearch = searchQuery ? l.phone.includes(searchQuery) || (l.name && l.name.toLowerCase().includes(searchQuery.toLowerCase())) : true;
            
            return matchIntention && matchStatus && matchRound && matchPhase && matchCallStatus && matchDelayed && matchSearch;
        });
    }, [leads, activeMainTab, activeSubTab, activeRound, activePhase, statusFilter, showOnlyDelayed, searchQuery]);

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

    if (!filters.selectedBatch) {
        return (
            <div className="text-center py-20 text-slate-500 bg-[#0f172a] rounded-2xl h-full flex flex-col items-center justify-center font-medium">
                <Users className="w-16 h-16 mb-4 text-slate-700 animate-pulse"/>
                Please select a Batch to start the campaign.
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col bg-[#0f172a] rounded-2xl border border-slate-800 overflow-hidden font-sans text-slate-200">
            
            {/* TOP HEADER & MONTH SWITCHER & METRICS OVERVIEW */}
            <div className="bg-[#1e293b]/70 backdrop-blur-md p-5 border-b border-slate-800 shrink-0">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-5">
                    <div>
                        <h2 className="text-white font-extrabold text-lg flex items-center gap-2">
                            <CalendarDays className="text-indigo-400 w-5 h-5"/> Retention & Billing Management
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">Manage monthly renewals and follow-ups professionally.</p>
                    </div>
                    
                    <div className="flex items-center gap-3 flex-wrap">
                        {/* START ROUND 2 CAMPAIGN BUTTON */}
                        <button 
                            onClick={handleStartRoundTwo} 
                            className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-2 shadow-md outline-none cursor-pointer uppercase tracking-wider transition-all"
                        >
                            🚀 Start Round 2
                        </button>

                        {/* DUAL ARROW-DROPDOWN MONTH SWITCHER */}
                        <div className="flex items-center gap-2 bg-[#0f172a] px-3 py-1.5 rounded-lg border border-slate-700 shadow-sm">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide mr-1 select-none">Target Month:</span>
                            <button 
                                onClick={() => setSelectedMonth(prev => Math.max(1, prev - 1))}
                                className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1 disabled:opacity-30 disabled:cursor-not-allowed"
                                disabled={selectedMonth === 1}
                            >
                                <FaChevronLeft size={12} />
                            </button>
                            <select 
                                value={selectedMonth} 
                                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                className="bg-transparent text-indigo-400 font-extrabold text-sm outline-none cursor-pointer border-none text-center px-1"
                            >
                                {monthNames.map((name, i) => (
                                    <option key={i+1} value={i+1} className="bg-[#1e293b] text-white font-semibold">
                                        {name} ({String(i+1).padStart(2, '0')})
                                    </option>
                                ))}
                            </select>
                            <button 
                                onClick={() => setSelectedMonth(prev => Math.min(12, prev + 1))}
                                className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1 disabled:opacity-30 disabled:cursor-not-allowed"
                                disabled={selectedMonth === 12}
                            >
                                <FaChevronRight size={12} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center gap-4 shadow-sm hover:scale-[1.01] transition-transform">
                        <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl"><Users className="w-6 h-6"/></div>
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">M-{selectedMonth - 1} Enrolled</p>
                            <h3 className="text-2xl font-black text-white mt-0.5">{retentionStats.prevMonthEnrolled}</h3>
                        </div>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center gap-4 shadow-sm hover:scale-[1.01] transition-transform">
                        <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl"><TrendingUp className="w-6 h-6"/></div>
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">M-{selectedMonth} Renewed</p>
                            <h3 className="text-2xl font-black text-emerald-400 mt-0.5">{retentionStats.thisMonthRenewed}</h3>
                        </div>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center gap-4 shadow-sm hover:scale-[1.01] transition-transform">
                        <div className="p-3 bg-red-500/10 text-red-400 rounded-xl"><TrendingDown className="w-6 h-6"/></div>
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">M-{selectedMonth} Dropped</p>
                            <h3 className="text-2xl font-black text-red-400 mt-0.5">{retentionStats.thisMonthDropped}</h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* TAB PANELS & CRM SEARCH FILTERS */}
            <div className="px-5 py-4 bg-[#1e293b]/40 backdrop-blur-md border-b border-slate-800 shrink-0 flex flex-col gap-4 shadow-sm z-10">
                <div className="flex gap-2">
                    {['FULL', 'MONTHLY', 'INSTALLMENT'].map(tab => (
                        <button key={tab} onClick={() => setActiveMainTab(tab)} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeMainTab === tab ? 'bg-indigo-600 text-white shadow-md' : 'bg-white/5 text-slate-400 border border-white/10 hover:text-white hover:bg-white/10'}`}>
                            {tab === 'FULL' ? 'Full Payment' : tab === 'MONTHLY' ? 'Monthly Pay' : 'Installment'}
                        </button>
                    ))}
                    
                    <button 
                        onClick={fetchPaidCampaignData} 
                        className="ml-auto bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 p-2.5 rounded-xl transition-all shadow-sm outline-none cursor-pointer flex items-center justify-center"
                        title="Reload Leads"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin text-indigo-400' : ''}/>
                    </button>
                </div>

                {activeMainTab !== 'FULL' && (
                    <div className="flex gap-2 bg-[#0f172a] p-1.5 rounded-xl border border-slate-800 w-full md:w-max">
                        <button onClick={() => setActiveSubTab('ENROLLED')} className={`flex-1 md:flex-none px-6 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${activeSubTab === 'ENROLLED' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}>Enrolled</button>
                        <button onClick={() => setActiveSubTab('NON_ENROLLED')} className={`flex-1 md:flex-none px-6 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${activeSubTab === 'NON_ENROLLED' ? 'bg-red-500/20 text-red-400' : 'text-slate-500 hover:text-slate-300'}`}>Non-Enrolled</button>
                    </div>
                )}

                <div className="flex justify-between items-center bg-[#0f172a] p-2.5 rounded-xl border border-slate-850 flex-wrap gap-3">
                    <div className="flex gap-2">
                        <button onClick={() => setActiveRound(1)} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeRound === 1 ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>Round 1</button>
                        <button onClick={() => setActiveRound(2)} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeRound === 2 ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>Round 2</button>
                    </div>
                    
                    <div className="flex gap-2 border-l border-slate-700 pl-3">
                        {[1, 2, 3].map(p => (
                            <button key={p} onClick={() => setActivePhase(p)} className={`w-8 h-8 rounded-lg text-xs font-bold uppercase transition-all ${activePhase === p ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-850'}`}>P{p}</button>
                        ))}
                    </div>

                    <div className="flex gap-3 flex-wrap flex-1 justify-end">
                        <select value={typingMode} onChange={(e) => setTypingMode(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs font-bold uppercase tracking-wide text-white outline-none cursor-pointer focus:border-indigo-500 w-24 shrink-0">
                            <option value="en" className="bg-slate-900 text-white">ENG</option>
                            <option value="si-phonetic" className="bg-slate-900 text-white">SIN</option>
                        </select>

                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs font-bold uppercase tracking-wide text-white outline-none cursor-pointer focus:border-indigo-500">
                            <option value="ALL" className="bg-slate-900 text-white">All Status</option>
                            <option value="pending" className="bg-slate-900 text-white">⏳ Pending</option>
                            <option value="answered" className="bg-slate-900 text-white">✅ Answered</option>
                            <option value="no_answer" className="bg-slate-900 text-white">📵 No Answer</option>
                            <option value="reject" className="bg-slate-900 text-white">❌ Rejected</option>
                        </select>

                        <button onClick={() => setShowOnlyDelayed(!showOnlyDelayed)} className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border flex items-center gap-2 ${showOnlyDelayed ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'}`}>
                            <FaExclamationTriangle size={12}/> Delayed
                        </button>

                        <div className="relative w-48">
                            <FaSearch className="absolute left-3.5 top-3 text-slate-500 text-xs" />
                            <input 
                                type="text" 
                                placeholder="Search number..." 
                                value={searchQuery} 
                                onChange={(e) => setSearchQuery(e.target.value)} 
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-9 pr-4 text-xs text-white outline-none focus:border-indigo-500" 
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* LEADS LIST AREA (GRID & SHIFT-DATE HEADERS) */}
            <div className="flex-1 bg-[#0b1120] flex flex-col relative overflow-hidden">
                {loading && (
                    <div className="absolute inset-0 flex justify-center items-center bg-[#0b1120]/80 backdrop-blur-sm z-10">
                        <Loader2 className="animate-spin text-indigo-500 w-8 h-8"/>
                    </div>
                )}

                {groupedLeads.length === 0 && !loading ? (
                    <div className="flex-1 flex flex-col justify-center items-center text-slate-500">
                        <Users className="w-12 h-12 mb-3 text-slate-700 opacity-30"/>
                        <p className="text-sm font-medium">No leads in Phase {activePhase} matching current criteria.</p>
                    </div>
                ) : (
                    <div className="overflow-y-auto custom-scrollbar flex-1 p-5 space-y-8 pb-16">
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

                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 px-2 animate-fade-in">
                                    {group.leads.slice(0, displayLimit).map((l, index) => {
                                        const realIndex = index + 1;
                                        return (
                                            <PaidLeadCard 
                                                key={l.id} 
                                                lead={{...l, realIndex}} 
                                                timer={getTimerDataText(l)} 
                                                drafts={drafts} 
                                                activeTab={activeMainTab === 'FULL' ? 'ENROLLED' : `ROUND_${activeRound}`} 
                                                isManager={false} 
                                                typingMode={typingMode} 
                                                handleUpdateLocalLead={handleUpdateLocalLead} 
                                                handleLocalCallStatusChange={handleLocalCallStatusChange} 
                                                handleRemarkTyping={handleRemarkTyping} 
                                                handleSaveCallData={handleSaveCallData} 
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
        </div>
    );
}