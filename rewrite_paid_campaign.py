content = """import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import axios from '../../../../api/axios';
import { FaSearch, FaCommentDots, FaArrowRight, FaTimes, FaBell, FaSave, FaTrash, FaCheckCircle, FaLayerGroup } from 'react-icons/fa';
import { Target, PhoneCall, Check, Loader, BookOpen, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AfterSeminarPaidCampaign({ filters, setChatModalLead, externalSearch }) {
    const currentUserId = JSON.parse(localStorage.getItem('user'))?.id;

    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [drafts, setDrafts] = useState({});
    
    const [activeMainTab, setActiveMainTab] = useState('MONTHLY'); // FULL, MONTHLY, INSTALLMENT, NON_ENROLLED
    const [activeRound, setActiveRound] = useState(1); 
    const [activePhase, setActivePhase] = useState('ALL'); // 'ALL', 1, 2, 3
    const [searchQuery, setSearchQuery] = useState(externalSearch || '');
    const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, PENDING, DELAYED

    const [monthlyGroups, setMonthlyGroups] = useState([]);
    const [selectedGroupName, setSelectedGroupName] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    
    const [showReminder, setShowReminder] = useState(false);
    const [reminderLead, setReminderLead] = useState(null);
    const [existingReminderId, setExistingReminderId] = useState(null);
    const [remindDate, setRemindDate] = useState('');
    const [remindTime, setRemindTime] = useState('');
    const [remindNote, setRemindNote] = useState('');
    const [isSubmittingReminder, setIsSubmittingReminder] = useState(false);

    const ITEMS_PER_PAGE = 20;

    useEffect(() => {
        if (filters.selectedBusiness && filters.selectedBatch) {
            setSelectedGroupName(null);
            fetchPaidCampaignData();
        } else {
            setLeads([]);
            setMonthlyGroups([]);
            setSelectedGroupName(null);
            setLoading(false);
        }
    }, [filters]);

    const fetchPaidCampaignData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/after-seminar-crm/retention/campaign-data', {
                headers: { Authorization: `Bearer ${token}` },
                params: { businessId: filters.selectedBusiness, batchId: filters.selectedBatch }
            });
            
            const myLeads = (res.data.leads || []).filter(l => l.assignedTo === currentUserId);
            setLeads(myLeads);

            const groups = res.data.monthlyGroups || [];
            setMonthlyGroups(groups);

            if (groups.length > 0) {
                setSelectedGroupName(prev => {
                    const exists = groups.some(g => g.name === prev);
                    if (exists) return prev;
                    return res.data.defaultActiveGroupName || groups[0].name;
                });
            } else {
                setSelectedGroupName(null);
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

    const handleUpdateLocalLead = (leadId, key, value) => {
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, [key]: value } : l));
    };

    const handleDraftRemark = (leadId, val) => {
        setDrafts(prev => ({ ...prev, [leadId]: val }));
        localStorage.setItem(`draft_paid_remark_${leadId}`, val);
    };

    const handleSaveCallData = async (leadId) => {
        const leadObj = leads.find(l => l.id === leadId);
        if (!leadObj) return;

        const finalStatus = leadObj.callStatus || 'pending';
        if (finalStatus === 'pending') {
            toast.error('Please select an Outcome before saving.');
            return;
        }

        const remarkVal = drafts[leadId] || leadObj.feedback || '';
        const loadToast = toast.loading("Saving progress...");

        try {
            const token = localStorage.getItem('token');
            const payload = {
                leadId: leadId,
                status: finalStatus,
                feedback: remarkVal,
                coordinationRound: leadObj.coordinationRound || 1,
                paymentIntention: leadObj.paymentIntention || 'NOT_DECIDED',
                enrollmentStatus: leadObj.enrollmentStatus || 'NON_ENROLLED',
                callAttempt: leadObj.callAttempt || 1,
                method: leadObj.callMethod || 'direct'
            };

            await axios.post('/after-seminar-crm/leads/update-call', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success("Progress saved successfully!", { id: loadToast });
            localStorage.removeItem(`draft_paid_remark_${leadId}`);
            
            const newDrafts = { ...drafts };
            delete newDrafts[leadId];
            setDrafts(newDrafts);
            
            handleUpdateLocalLead(leadId, 'feedback', remarkVal);
            // Optionally refetch or let it stay in UI
            fetchPaidCampaignData();
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to save workflow state", { id: loadToast });
        }
    };

    const handlePushToNextRound = async (leadId, currentRound, callStatus, phase) => {
        if (callStatus === 'pending' || !callStatus) return toast.error("Change Status before pushing!");
        if (callStatus === 'reject') return toast.error("Rejected leads cannot be pushed to the next round.");
        if (!window.confirm(`Move this lead to the next round? Remarks will be kept, but status will reset.`)) return;

        const loadToast = toast.loading("Moving lead to next round...");
        try {
            await axios.post('/after-seminar-crm/leads/bulk-action', { action: 'CHANGE_ROUND', leadIds: [leadId], targetRound: currentRound + 1 }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
            toast.success("Lead pushed successfully!", { id: loadToast });
            setTimeout(() => window.location.reload(), 800);
        } catch (e) { toast.error("Failed to push lead.", { id: loadToast }); }
    };

    // Reminder Logic
    const handleOpenReminderModal = async (lead, e) => {
        if(e) e.preventDefault();
        setReminderLead(lead);
        const loadToast = toast.loading("Loading reminder details...");
        try {
            const loggedUser = JSON.parse(localStorage.getItem('user') || '{}');
            const agentId = loggedUser.id || loggedUser.userId;
            const res = await axios.get(`/reminders/my-reminders?agentId=${agentId}`);
            const existing = res.data.find(r => r.leadId === lead.id);

            if (existing) {
                setExistingReminderId(existing.id);
                const d = new Date(existing.remindAt);
                setRemindDate(d.toISOString().split('T')[0]);
                setRemindTime(d.toTimeString().slice(0, 5));
                setRemindNote(existing.note || '');
            } else {
                setExistingReminderId(null);
                setRemindDate(''); setRemindTime(''); setRemindNote('');
            }
            toast.dismiss(loadToast);
            setShowReminder(true);
        } catch (error) {
            toast.error("Failed to load data.", { id: loadToast });
        }
    };

    const handleSetReminder = async () => {
        if (!remindDate || !remindTime) return toast.error("Please select a date and time!");
        setIsSubmittingReminder(true);
        const loadToast = toast.loading(existingReminderId ? "Updating reminder..." : "Setting reminder...");
        try {
            const token = localStorage.getItem('token');
            const loggedUser = JSON.parse(localStorage.getItem('user') || '{}');
            const agentId = loggedUser.id || loggedUser.userId;
            const formattedDate = new Date(`${remindDate}T${remindTime}:00`).toISOString();
            
            if (existingReminderId) {
                await axios.put('/reminders/edit', { reminderId: existingReminderId, remindAt: formattedDate, note: remindNote }, { headers: { Authorization: `Bearer ${token}` } });
                toast.success("Reminder updated successfully!", { id: loadToast });
            } else {
                await axios.post('/reminders/create', { leadId: reminderLead.id, agentId: agentId, leadType: reminderLead.inquiryType || 'UNKNOWN', phone: reminderLead.phone, name: reminderLead.name, round: reminderLead.coordinationRound || 1, phase: reminderLead.phase || 1, remindAt: formattedDate, note: remindNote }, { headers: { Authorization: `Bearer ${token}` } });
                toast.success("Reminder set successfully!", { id: loadToast });
            }
            setShowReminder(false);
        } catch (error) { toast.error("Operation failed.", { id: loadToast }); } 
        finally { setIsSubmittingReminder(false); }
    };

    const handleDeleteReminder = async () => {
        if (!window.confirm("Are you sure you want to delete this reminder?")) return;
        setIsSubmittingReminder(true);
        const loadToast = toast.loading("Deleting reminder...");
        try {
            await axios.delete(`/reminders/delete/${existingReminderId}`);
            toast.success("Reminder deleted!", { id: loadToast });
            setShowReminder(false);
        } catch (error) { toast.error("Failed to delete.", { id: loadToast }); } 
        finally { setIsSubmittingReminder(false); }
    };

    // Derived Logic
    const isLeadDelayed = (l) => {
        if (l.enrollmentStatus === 'ENROLLED') return false;
        const startTime = l.updatedAt ? new Date(l.updatedAt).getTime() : new Date(l.assignedAt || l.createdAt).getTime();
        const now = new Date().getTime();
        const diffHours = (now - startTime) / (1000 * 60 * 60);
        return diffHours >= 120;
    };

    const isLeadPending = (l) => {
        return !['answered', 'reject'].includes(l.callStatus);
    };

    const mappedLeads = useMemo(() => {
        return leads.map(l => {
            let effectiveEnrollmentStatus = l.enrollmentStatus;
            let effectivePaymentIntention = l.paymentIntention;

            if (selectedGroupName && l.paymentIntention !== 'FULL') {
                const selectedGroup = monthlyGroups.find(g => g.name === selectedGroupName);
                const hasPaidForSelectedGroup = l.enrolledGroupIds && selectedGroup && l.enrolledGroupIds.some(id => selectedGroup.ids.includes(id));
                if (hasPaidForSelectedGroup) {
                    effectiveEnrollmentStatus = 'ENROLLED';
                } else {
                    effectiveEnrollmentStatus = 'NON_ENROLLED';
                }
            }

            return { ...l, effectiveEnrollmentStatus, effectivePaymentIntention };
        });
    }, [leads, selectedGroupName, monthlyGroups]);

    // Apply Filters for the current view
    const visibleLeads = useMemo(() => {
        let filtered = mappedLeads.filter(l => {
            let matchTab = false;
            if (activeMainTab === 'NON_ENROLLED') {
                matchTab = l.effectiveEnrollmentStatus === 'NON_ENROLLED';
            } else {
                matchTab = l.effectiveEnrollmentStatus === 'ENROLLED' && l.effectivePaymentIntention === activeMainTab;
            }

            const matchRound = (l.coordinationRound || 1) === activeRound;
            const matchPhase = activePhase === 'ALL' ? true : (l.phase || 1) === activePhase;
            const matchSearch = searchQuery ? (l.phone && l.phone.includes(searchQuery)) || (l.name && l.name.toLowerCase().includes(searchQuery.toLowerCase())) : true;
            
            return matchTab && matchRound && matchPhase && matchSearch;
        });

        if (statusFilter === 'PENDING') {
            filtered = filtered.filter(isLeadPending);
        } else if (statusFilter === 'DELAYED') {
            filtered = filtered.filter(isLeadDelayed);
        }

        filtered.sort((a, b) => {
            const aTime = new Date(a.assignedAt || a.createdAt || 0).getTime();
            const bTime = new Date(b.assignedAt || b.createdAt || 0).getTime();
            return bTime - aTime;
        });

        return filtered;
    }, [mappedLeads, activeMainTab, activeRound, activePhase, searchQuery, statusFilter]);

    const stats = useMemo(() => {
        const baseLeads = mappedLeads.filter(l => {
            let matchTab = false;
            if (activeMainTab === 'NON_ENROLLED') {
                matchTab = l.effectiveEnrollmentStatus === 'NON_ENROLLED';
            } else {
                matchTab = l.effectiveEnrollmentStatus === 'ENROLLED' && l.effectivePaymentIntention === activeMainTab;
            }
            const matchRound = (l.coordinationRound || 1) === activeRound;
            const matchPhase = activePhase === 'ALL' ? true : (l.phase || 1) === activePhase;
            return matchTab && matchRound && matchPhase;
        });

        let totalAssigned = baseLeads.length;
        let pending = baseLeads.filter(isLeadPending).length;
        let covered = totalAssigned - pending;
        let responseRate = totalAssigned > 0 ? ((covered / totalAssigned) * 100).toFixed(1) : 0;
        let delayed = baseLeads.filter(isLeadDelayed).length;

        return { totalAssigned, covered, pending, responseRate, delayed };
    }, [mappedLeads, activeMainTab, activeRound, activePhase]);

    const totalPages = Math.ceil(visibleLeads.length / ITEMS_PER_PAGE);
    const paginatedLeads = visibleLeads.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const getTimerDataText = (lead) => {
        if (!lead) return null;
        if (lead.effectiveEnrollmentStatus === 'ENROLLED') return null;

        const startTime = lead.updatedAt ? new Date(lead.updatedAt).getTime() : new Date(lead.assignedAt || lead.createdAt).getTime();
        const now = new Date().getTime();
        const diffHours = (now - startTime) / (1000 * 60 * 60);
        const timeLeft = 120 - diffHours; // 5 days

        if (timeLeft > 0) {
            const days = Math.floor(timeLeft / 24);
            const hrs = Math.floor(timeLeft % 24);
            return { text: `⏳ ${days}d ${hrs}h LEFT`, isLate: false };
        } else {
            const lateHours = Math.abs(timeLeft);
            const days = Math.floor(lateHours / 24);
            const hrs = Math.floor(lateHours % 24);
            return { text: `⚠️ -${days}d ${hrs}h LATE`, isLate: true };
        }
    };

    if (!filters.selectedBatch) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-slate-500 bg-[#111827] rounded-[2rem] border border-slate-800 mt-4">
                <h3 className="text-xl font-bold mb-1 text-slate-400">Select a Batch</h3>
                <p className="text-sm">Please select a batch to load campaign data.</p>
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col bg-transparent overflow-y-auto custom-scrollbar font-sans text-slate-100">
            <div className="fade-in">

                {/* Header matching Open Seminar detail view */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-white/5 pb-4 mt-2">
                    <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-400 to-indigo-400 flex items-center gap-3">
                        <Target className="text-emerald-400" />
                        ENROLLED STUDENTS CAMPAIGN
                    </h1>
                    
                    {/* Active Group Period Selector */}
                    {monthlyGroups && monthlyGroups.length > 0 && (
                        <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-xl backdrop-blur-md shadow-sm w-full md:w-auto">
                            <FaLayerGroup className="text-amber-400" />
                            <span className="text-xs font-bold text-slate-400 whitespace-nowrap">Group Period:</span>
                            <select 
                                value={selectedGroupName || ''} 
                                onChange={(e) => { setSelectedGroupName(e.target.value); setCurrentPage(1); }}
                                className="bg-transparent border-none text-amber-400 text-sm font-black outline-none cursor-pointer w-full md:w-auto appearance-none pr-4"
                            >
                                {monthlyGroups.map((group, idx) => (
                                    <option key={idx} value={group.name} className="bg-slate-900 text-slate-200">
                                        📅 {group.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Top Plan Buttons */}
                <div className="flex gap-2 bg-[#0F172A]/80 p-2 rounded-2xl flex-wrap shadow-inner mb-6 w-max border border-white/5">
                    <button
                        onClick={() => { setActiveMainTab('FULL'); setActivePhase('ALL'); setCurrentPage(1); setStatusFilter('ALL'); }}
                        className={`px-6 py-2.5 rounded-xl font-black uppercase tracking-wider transition-all text-sm ${activeMainTab === 'FULL' ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                        FULL PAYMENT
                    </button>
                    <button
                        onClick={() => { setActiveMainTab('MONTHLY'); setActivePhase('ALL'); setCurrentPage(1); setStatusFilter('ALL'); }}
                        className={`px-6 py-2.5 rounded-xl font-black uppercase tracking-wider transition-all text-sm ${activeMainTab === 'MONTHLY' ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                        MONTHLY PLAN
                    </button>
                    <button
                        onClick={() => { setActiveMainTab('INSTALLMENT'); setActivePhase('ALL'); setCurrentPage(1); setStatusFilter('ALL'); }}
                        className={`px-6 py-2.5 rounded-xl font-black uppercase tracking-wider transition-all text-sm ${activeMainTab === 'INSTALLMENT' ? 'bg-gradient-to-r from-violet-500 to-violet-600 text-white shadow-lg shadow-violet-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                        INSTALLMENTS
                    </button>
                    <button
                        onClick={() => { setActiveMainTab('NON_ENROLLED'); setActivePhase('ALL'); setCurrentPage(1); setStatusFilter('ALL'); }}
                        className={`px-6 py-2.5 rounded-xl font-black uppercase tracking-wider transition-all text-sm ${activeMainTab === 'NON_ENROLLED' ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                        NON ENROLLED
                    </button>
                </div>

                <div className="flex gap-2 bg-[#0F172A]/80 p-2 rounded-2xl flex-wrap shadow-inner mb-6 w-max border border-white/5">
                    <button
                        onClick={() => { setActiveRound(1); setCurrentPage(1); }}
                        className={`px-6 py-1.5 rounded-xl font-black uppercase tracking-wider transition-all text-xs ${activeRound === 1 ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                        ROUND 1
                    </button>
                    <button
                        onClick={() => { setActiveRound(2); setCurrentPage(1); }}
                        className={`px-6 py-1.5 rounded-xl font-black uppercase tracking-wider transition-all text-xs ${activeRound === 2 ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                        ROUND 2
                    </button>
                </div>

                {/* Stats & Filters Box */}
                <div className="bg-white/5 border border-white/10 p-6 rounded-3xl mb-6 backdrop-blur-sm shadow-lg">
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">

                        {/* Stats Section */}
                        <div className="flex gap-6 items-center bg-[#0F172A]/50 p-4 px-8 rounded-3xl border border-white/5 shadow-inner flex-wrap w-full xl:w-auto">
                            <div className="text-slate-500 font-black uppercase tracking-[0.2em] text-xs mr-4 hidden md:block">Stats</div>
                            <div className="flex flex-col items-center"><span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Assigned</span><span className="text-2xl font-black text-white">{stats.totalAssigned}</span></div>
                            <div className="w-px h-10 bg-white/10 mx-2 hidden md:block"></div>
                            <div className="flex flex-col items-center"><span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider mb-1">Pending</span><span className="text-2xl font-black text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]">{stats.pending}</span></div>
                            <div className="w-px h-10 bg-white/10 mx-2 hidden md:block"></div>
                            <div className="flex flex-col items-center"><span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider mb-1">Covered</span><span className="text-2xl font-black text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]">{stats.covered}</span></div>
                            <div className="w-px h-10 bg-white/10 mx-2 hidden md:block"></div>
                            <div className="flex flex-col items-center"><span className="text-[10px] text-blue-500 font-bold uppercase tracking-wider mb-1">Response</span><span className="text-2xl font-black text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]">{stats.responseRate}%</span></div>
                            <div className="w-px h-10 bg-white/10 mx-2 hidden md:block"></div>
                            <div className="flex flex-col items-center"><span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider mb-1">Delayed</span><span className="text-2xl font-black text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]">{stats.delayed}</span></div>
                        </div>

                        {/* Filters & Search */}
                        <div className="flex flex-col gap-3 min-w-[300px] w-full xl:w-auto">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-2">Filters:</span>
                                <button
                                    onClick={() => { setStatusFilter(statusFilter === 'PENDING' ? 'ALL' : 'PENDING'); setCurrentPage(1); }}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${statusFilter === 'PENDING' ? 'bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-[#0F172A] border border-white/10 text-amber-400 hover:bg-white/5'}`}
                                >
                                    ⏳ PENDING
                                </button>
                                <button
                                    onClick={() => { setStatusFilter(statusFilter === 'DELAYED' ? 'ALL' : 'DELAYED'); setCurrentPage(1); }}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${statusFilter === 'DELAYED' ? 'bg-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 'bg-[#0F172A] border border-white/10 text-rose-400 hover:bg-white/5'}`}
                                >
                                    ⚠️ DELAYED
                                </button>
                                {statusFilter !== 'ALL' && (
                                    <button
                                        onClick={() => { setStatusFilter('ALL'); setCurrentPage(1); }}
                                        className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center gap-1"
                                    >
                                        <FaTimes size={10} /> CLEAR
                                    </button>
                                )}
                            </div>

                            <div className="relative">
                                <FaSearch className="absolute left-3.5 top-3.5 text-slate-400 text-sm" />
                                <input type="text" placeholder="Search leads by phone or name..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="w-full bg-[#0F172A] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm font-bold text-slate-200 outline-none focus:border-indigo-500 shadow-inner" />
                            </div>
                        </div>

                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left Sidebar for Phases */}
                    <div className="w-full lg:w-24 shrink-0 flex flex-row lg:flex-col gap-3 overflow-x-auto custom-scrollbar pb-2 lg:pb-0">
                        {[1, 2, 3].map(ph => {
                            let phLeads = mappedLeads.filter(l => {
                                let matchTab = false;
                                if (activeMainTab === 'NON_ENROLLED') {
                                    matchTab = l.effectiveEnrollmentStatus === 'NON_ENROLLED';
                                } else {
                                    matchTab = l.effectiveEnrollmentStatus === 'ENROLLED' && l.effectivePaymentIntention === activeMainTab;
                                }
                                const matchRound = (l.coordinationRound || 1) === activeRound;
                                return matchTab && matchRound;
                            });
                            const phCount = phLeads.filter(l => (l.phase || 1) === ph).length;

                            return (
                                <button
                                    key={ph}
                                    onClick={() => { setActivePhase(ph); setCurrentPage(1); }}
                                    className={`flex flex-col items-center justify-center py-4 px-6 lg:px-0 rounded-2xl transition-all relative overflow-hidden min-w-[100px] lg:min-w-0 ${activePhase === ph
                                        ? 'bg-gradient-to-b from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                        : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10'
                                        }`}
                                >
                                    <span className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">Phase</span>
                                    <span className="text-2xl font-black">0{ph}</span>
                                    {phCount > 0 && (
                                        <span className="mt-2 bg-black/30 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-inner">{phCount} leads</span>
                                    )}
                                </button>
                            );
                        })}
                        <button
                            onClick={() => { setActivePhase('ALL'); setCurrentPage(1); }}
                            className={`flex flex-col items-center justify-center py-4 px-6 lg:px-0 rounded-2xl transition-all relative overflow-hidden min-w-[100px] lg:min-w-0 ${activePhase === 'ALL'
                                ? 'bg-gradient-to-b from-slate-600 to-slate-700 text-white shadow-lg shadow-slate-500/20'
                                : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10'
                                }`}
                        >
                            <span className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">View</span>
                            <span className="text-lg font-black uppercase">All</span>
                        </button>
                    </div>

                    {/* Main Leads Grid */}
                    <div className="flex-1">
                        {loading ? (
                            <div className="flex justify-center items-center py-20">
                                <Loader2 className="animate-spin text-indigo-500 w-12 h-12"/>
                            </div>
                        ) : paginatedLeads.length === 0 ? (
                            <div className="text-center py-20 bg-white/5 border border-white/10 rounded-3xl shadow-lg">
                                <PhoneCall className="text-slate-600 mx-auto mb-4" size={48} />
                                <h3 className="text-xl font-bold text-slate-400">No Leads Found</h3>
                                <p className="text-slate-500 mt-2">There are no leads matching your current filters.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-10">
                                {paginatedLeads.map((lead, index) => {
                                    const realIndex = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                                    const currentRemark = drafts[lead.id] !== undefined ? drafts[lead.id] : (lead.feedback || '');
                                    const isDraft = drafts[lead.id] !== undefined && drafts[lead.id] !== lead.feedback;

                                    const callOutcome = lead.callStatus || 'pending';
                                    const canPushRound = activeRound !== 3 && (
                                        (lead.phase === 1 && callOutcome === 'answered') ||
                                        (lead.phase === 2 && (callOutcome === 'answered' || callOutcome === 'no_answer'))
                                    );

                                    let enrollmentValue = lead.enrollmentStatus;
                                    if (lead.enrollmentStatus === 'ENROLLED') {
                                        if (lead.paymentIntention === 'FULL') enrollmentValue = 'ENROLLED_FULL';
                                        else if (lead.paymentIntention === 'MONTHLY') enrollmentValue = 'ENROLLED_MONTHLY';
                                        else if (lead.paymentIntention === 'INSTALLMENT') enrollmentValue = 'ENROLLED_INSTALLMENT';
                                    } else {
                                        enrollmentValue = 'NON_ENROLLED';
                                    }

                                    const timerData = getTimerDataText(lead);

                                    return (
                                        <div key={lead.id} className="bg-[#1e1b4b]/80 backdrop-blur-md rounded-2xl border border-indigo-500/20 p-5 shadow-xl hover:border-indigo-400/50 transition-all group flex flex-col">
                                            {/* Top Section */}
                                            <div className="flex justify-between items-start mb-4 pb-4 border-b border-indigo-500/20">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-black shadow-inner relative">
                                                        {realIndex}
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <h3 className="text-lg font-black text-white leading-tight tracking-wide truncate">{lead.phone?.split('_')[0]}</h3>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <p className="text-slate-400 text-[10px] font-bold uppercase truncate max-w-[120px]">~ {lead.name || 'Unknown'}</p>
                                                            {timerData && (
                                                                <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow-sm border ${timerData.isLate ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>
                                                                    {timerData.text}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Grid for Outcome, Attempt, and Paid Fields */}
                                            <div className="grid grid-cols-12 gap-3 mb-4">
                                                <div className="col-span-8">
                                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Outcome</label>
                                                    <select
                                                        value={callOutcome}
                                                        onChange={(e) => handleUpdateLocalLead(lead.id, 'callStatus', e.target.value)}
                                                        className={`w-full bg-[#312e81]/30 border rounded-xl px-2 py-2 text-xs font-bold outline-none appearance-none transition-colors
                                                            ${callOutcome === 'pending' ? 'border-amber-500/30 text-amber-400' :
                                                                callOutcome === 'answered' ? 'border-emerald-500/30 text-emerald-400' :
                                                                    callOutcome === 'no_answer' ? 'border-blue-500/30 text-blue-400' :
                                                                        'border-rose-500/30 text-rose-400'}`}
                                                    >
                                                        <option value="pending" className="bg-[#0f172a] text-amber-400">⌛ PENDING</option>
                                                        <option value="answered" className="bg-[#0f172a] text-emerald-400">✅ ANSWERED</option>
                                                        <option value="no_answer" className="bg-[#0f172a] text-blue-400">🔇 NO ANSWER</option>
                                                        <option value="reject" className="bg-[#0f172a] text-rose-400">❌ REJECT</option>
                                                    </select>
                                                </div>
                                                <div className="col-span-4">
                                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Att.</label>
                                                    <select
                                                        value={lead.callAttempt || 1}
                                                        onChange={(e) => handleUpdateLocalLead(lead.id, 'callAttempt', parseInt(e.target.value))}
                                                        className="w-full bg-rose-500/10 border border-rose-500/30 rounded-xl px-2 py-2 text-xs font-black text-rose-400 outline-none focus:border-rose-500 appearance-none text-center"
                                                    >
                                                        {[1, 2, 3, 4, 5].map(n => <option key={n} value={n} className="bg-[#0f172a] text-rose-400">{n}</option>)}
                                                    </select>
                                                </div>

                                                <div className="col-span-6">
                                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Method</label>
                                                    <select
                                                        value={lead.callMethod || 'direct'}
                                                        onChange={(e) => handleUpdateLocalLead(lead.id, 'callMethod', e.target.value)}
                                                        className="w-full bg-[#312e81]/30 border border-indigo-500/20 rounded-xl px-2 py-2 text-xs font-bold text-indigo-200 outline-none appearance-none"
                                                    >
                                                        <option value="direct" className="bg-[#0f172a]">Direct Call</option>
                                                        <option value="whatsapp" className="bg-[#0f172a]">WhatsApp</option>
                                                        <option value="3cx" className="bg-[#0f172a]">3CX</option>
                                                    </select>
                                                </div>
                                                <div className="col-span-6">
                                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Enrollment</label>
                                                    <select
                                                        value={enrollmentValue}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            if (val === 'NON_ENROLLED') {
                                                                handleUpdateLocalLead(lead.id, 'enrollmentStatus', 'NON_ENROLLED');
                                                                handleUpdateLocalLead(lead.id, 'paymentIntention', 'NOT_DECIDED');
                                                            } else {
                                                                handleUpdateLocalLead(lead.id, 'enrollmentStatus', 'ENROLLED');
                                                                const plan = val.split('_')[1];
                                                                handleUpdateLocalLead(lead.id, 'paymentIntention', plan);
                                                            }
                                                        }}
                                                        className={`w-full bg-[#312e81]/30 border border-indigo-500/20 rounded-xl px-2 py-2 text-xs font-bold outline-none appearance-none ${lead.enrollmentStatus === 'ENROLLED' ? 'text-emerald-400 border-emerald-500/30' : 'text-indigo-200'}`}
                                                    >
                                                        <option value="NON_ENROLLED" className="bg-[#0f172a]">Non-Enrolled</option>
                                                        <option value="ENROLLED_FULL" className="bg-[#0f172a]">Enrolled - Full</option>
                                                        <option value="ENROLLED_MONTHLY" className="bg-[#0f172a]">Enrolled - Monthly</option>
                                                        <option value="ENROLLED_INSTALLMENT" className="bg-[#0f172a]">Enrolled - Install</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="mb-4 relative flex-1 flex flex-col">
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Remarks</label>
                                                <textarea
                                                    rows="2"
                                                    value={currentRemark}
                                                    onChange={(e) => handleDraftRemark(lead.id, e.target.value)}
                                                    placeholder="Add your notes..."
                                                    className="w-full flex-1 bg-[#312e81]/30 border border-indigo-500/20 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-indigo-500 resize-none placeholder-indigo-300/30 transition-colors custom-scrollbar"
                                                />
                                                {isDraft && <span className="absolute -top-2 right-2 bg-yellow-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded border border-yellow-400 shadow-sm">DRAFT</span>}
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex gap-2 mt-auto">
                                                <button
                                                    onClick={() => handleSaveCallData(lead.id)}
                                                    className="flex-1 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-black text-xs uppercase tracking-widest rounded-xl py-2.5 flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(225,29,72,0.3)] hover:shadow-[0_0_25px_rgba(225,29,72,0.5)] transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none"
                                                >
                                                    <Check size={16} strokeWidth={3} /> SAVE PROGRESS
                                                </button>

                                                <button
                                                    onClick={() => setChatModalLead(lead)}
                                                    className="bg-indigo-600/50 hover:bg-indigo-500 border border-indigo-500/50 text-white p-2.5 rounded-xl flex items-center justify-center relative transition-all shadow-md transform hover:-translate-y-0.5"
                                                    title="Open Chat"
                                                >
                                                    <FaCommentDots size={14} />
                                                    {(lead.unreadCount || 0) > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping"></span>}
                                                    {(lead.unreadCount || 0) > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border border-[#1e1b4b]"></span>}
                                                </button>

                                                <button
                                                    onClick={(e) => handleOpenReminderModal(lead, e)}
                                                    title="Set a Reminder"
                                                    className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 p-2.5 rounded-xl flex items-center justify-center transition-all shadow-md transform hover:-translate-y-0.5"
                                                >
                                                    <FaBell size={14} />
                                                </button>
                                            </div>
                                            
                                            {canPushRound && (
                                                <button onClick={() => handlePushToNextRound(lead.id, lead.coordinationRound || 1, callOutcome, lead.phase)} className="mt-3 w-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 uppercase transition-colors shadow-sm">
                                                    Push To Round {(lead.coordinationRound || 1) + 1} <FaArrowRight size={10} />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex justify-center items-center gap-4 mt-2 mb-10 bg-white/5 border border-white/10 p-3 rounded-2xl w-max mx-auto shadow-sm backdrop-blur-sm">
                                <button
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(p => p - 1)}
                                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-50 text-slate-300 font-bold transition-all text-xs tracking-widest uppercase"
                                >
                                    Previous
                                </button>
                                <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">Page {currentPage} of {totalPages}</span>
                                <button
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(p => p + 1)}
                                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-50 text-slate-300 font-bold transition-all text-xs tracking-widest uppercase"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* REMINDER MODAL */}
            {showReminder && reminderLead && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-5 border-b border-slate-800 pb-3">
                            <h3 className="text-white font-bold flex items-center gap-2 text-lg"><FaBell className="text-amber-500"/> {existingReminderId ? 'Update Reminder' : 'Set Reminder'}</h3>
                            <button onClick={() => setShowReminder(false)} className="text-slate-400 hover:text-rose-400 bg-white/5 hover:bg-white/10 p-2 rounded-lg transition-colors"><FaTimes size={14}/></button>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-500 flex justify-center items-center font-black text-xs shrink-0"><FaBell size={14}/></div>
                                <div className="overflow-hidden">
                                    <p className="text-sm font-bold text-white tracking-wide truncate">{reminderLead.phone}</p>
                                    <p className="text-[10px] text-amber-400 uppercase tracking-widest truncate">{reminderLead.name || 'Student'}</p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date</label>
                                    <input type="date" value={remindDate} onChange={e=>setRemindDate(e.target.value)} className="w-full bg-black/40 border border-slate-700 rounded-lg p-2.5 text-sm font-semibold text-white outline-none focus:border-amber-500 mt-1" min={new Date().toISOString().split('T')[0]}/>
                                </div>
                                <div className="flex-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Time</label>
                                    <input type="time" value={remindTime} onChange={e=>setRemindTime(e.target.value)} className="w-full bg-black/40 border border-slate-700 rounded-lg p-2.5 text-sm font-semibold text-white outline-none focus:border-amber-500 mt-1"/>
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Note (Optional)</label>
                                <textarea value={remindNote} onChange={e=>setRemindNote(e.target.value)} placeholder="e.g. Call after 5PM, father will answer..." className="w-full bg-black/40 border border-slate-700 rounded-lg p-2.5 text-xs text-white outline-none focus:border-amber-500 mt-1 resize-none h-20 custom-scrollbar"></textarea>
                            </div>
                            
                            {existingReminderId ? (
                                <div className="flex gap-2 mt-2">
                                    <button disabled={isSubmittingReminder} onClick={handleSetReminder} className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-widest py-3 rounded-xl transition-all shadow-lg shadow-amber-500/20 flex justify-center items-center gap-2">
                                        {isSubmittingReminder ? <Loader2 className="animate-spin" size={16}/> : <FaSave size={14}/>} Update
                                    </button>
                                    <button disabled={isSubmittingReminder} onClick={handleDeleteReminder} className="px-4 bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition-all shadow-lg shadow-rose-500/20 flex justify-center items-center">
                                        {isSubmittingReminder ? <Loader2 className="animate-spin" size={16}/> : <FaTrash size={14}/>}
                                    </button>
                                </div>
                            ) : (
                                <button disabled={isSubmittingReminder} onClick={handleSetReminder} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-widest py-3.5 rounded-xl mt-2 transition-all flex justify-center items-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50">
                                    {isSubmittingReminder ? <Loader2 className="animate-spin" size={16}/> : <FaCheckCircle size={16}/>} Save Reminder
                                </button>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
"""

with open('/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AftersemPaid/AfterSeminarPaidCampaign.jsx', 'w') as f:
    f.write(content)

# We can safely delete or ignore CampaignHeader and LeadCard since they are no longer used by PaidCampaign
