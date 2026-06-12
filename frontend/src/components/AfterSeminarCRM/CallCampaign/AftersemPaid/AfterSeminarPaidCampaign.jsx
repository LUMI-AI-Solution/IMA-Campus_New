import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import axios from '../../../../api/axios';
import { FaSearch, FaCommentDots, FaArrowRight, FaTimes, FaBell, FaSave, FaTrash, FaCheckCircle, FaLayerGroup, FaDownload } from 'react-icons/fa';
import { Target, PhoneCall, Check, Loader, BookOpen, Loader2, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AfterSeminarPaidCampaign({ filters, setChatModalLead, externalSearch }) {
    const currentUserId = JSON.parse(localStorage.getItem('user'))?.id;

    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [drafts, setDrafts] = useState({});
    const [reasonDrafts, setReasonDrafts] = useState({});
    
    const [activeMainTab, setActiveMainTab] = useState('MONTHLY'); // FULL, MONTHLY, INSTALLMENT, NON_ENROLLED
    const [activeAttemptFilter, setActiveAttemptFilter] = useState('ALL'); // 'ALL', 1, 2
    const [activePhase, setActivePhase] = useState('ALL'); // 'ALL', 1, 2
    const [searchQuery, setSearchQuery] = useState(externalSearch || '');
    const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, PENDING

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

    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [historyLead, setHistoryLead] = useState(null);

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

    const handleDraftReason = (leadId, val) => {
        setReasonDrafts(prev => ({ ...prev, [leadId]: val }));
    };

    const handleSaveCallData = async (leadId) => {
        const leadObj = leads.find(l => l.id === leadId);
        if (!leadObj) return;

        const finalStatus = leadObj.callStatus || 'pending';
        if (finalStatus === 'pending') {
            toast.error('Please select an Outcome before saving.');
            return;
        }

        const remarkVal = drafts[leadId] !== undefined ? drafts[leadId] : (leadObj.feedback || '');
        const reasonVal = reasonDrafts[leadId] !== undefined ? reasonDrafts[leadId] : (leadObj.nonEnrolledReason || '');
        const loadToast = toast.loading("Saving progress...");

        try {
            const token = localStorage.getItem('token');
            const payload = {
                leadId: leadId,
                status: finalStatus,
                feedback: remarkVal,
                nonEnrolledReason: reasonVal,
                coordinationRound: leadObj.coordinationRound || 1,
                paymentIntention: leadObj.paymentIntention || 'NOT_DECIDED',
                enrollmentStatus: leadObj.enrollmentStatus || 'NON_ENROLLED',
                callAttempt: leadObj.callAttempt || 1,
                method: leadObj.callMethod || 'direct'
            };

            const response = await axios.post('/after-seminar-crm/leads/update-call', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success("Progress saved successfully!", { id: loadToast });
            localStorage.removeItem(`draft_paid_remark_${leadId}`);
            
            const newDrafts = { ...drafts };
            delete newDrafts[leadId];
            setDrafts(newDrafts);

            const newReasonDrafts = { ...reasonDrafts };
            delete newReasonDrafts[leadId];
            setReasonDrafts(newReasonDrafts);
            
            if (response.data && response.data.lead) {
                setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...response.data.lead } : l));
            } else {
                handleUpdateLocalLead(leadId, 'feedback', remarkVal);
            }
            
            // Optionally refetch or let it stay in UI
            // fetchPaidCampaignData();
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

    const exportToCSV = () => {
        if (!mappedLeads || mappedLeads.length === 0) return toast.error("No data to export!");

        const headers = ["Student Name", "Phone", "Phase", "Payment Plan", "Tab Status", "Call Attempt", "Call Outcome", "Remarks", "Non-Enrolled Reason", "Enrolled Subjects"];
        let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n";

        mappedLeads.forEach(lead => {
            const name = `"${(lead.name || 'Unknown').replace(/"/g, '""')}"`;
            const phone = lead.phone?.split('_')[0] || '';
            const phase = Number(lead.phase) || 1;
            const paymentPlan = lead.paymentIntention || 'NOT_DECIDED';
            const tabStatus = lead.effectiveEnrollmentStatus || 'UNKNOWN';
            const attempt = lead.callAttempt || 1;
            const outcome = lead.callStatus || 'pending';
            const remarks = `"${(lead.feedback || '').replace(/"/g, '""')}"`;
            const nonEnrolledReason = `"${(lead.nonEnrolledReason || '').replace(/"/g, '""')}"`;
            const subjects = `"${(lead.assignedSubjects && lead.assignedSubjects.length > 0 ? lead.assignedSubjects.join(', ') : (lead.batch?.name || 'General')).replace(/"/g, '""')}"`;

            const row = [name, phone, phase, paymentPlan, tabStatus, attempt, outcome, remarks, nonEnrolledReason, subjects].join(",");
            csvContent += row + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Enrolled_Campaign_Export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Derived Logic
    const isLeadPending = (l) => {
        return !['answered', 'reject'].includes(l.callStatus);
    };

    const mappedLeads = useMemo(() => {
        return leads.map(l => {
            let effectiveEnrollmentStatus = l.enrollmentStatus;
            let effectivePaymentIntention = l.paymentIntention;
            
            let activeGroupIndex = monthlyGroups.findIndex(g => g.name === selectedGroupName);
            let unpaidCount = 0;

            if (selectedGroupName && l.paymentIntention !== 'FULL') {
                if (activeGroupIndex >= 0) {
                    for (let i = 0; i <= activeGroupIndex; i++) {
                        const pm = monthlyGroups[i];
                        const hasPaid = l.enrolledGroupIds && pm.ids.some(id => l.enrolledGroupIds.includes(id));
                        if (!hasPaid) unpaidCount++;
                    }
                }
            }

            return { ...l, effectiveEnrollmentStatus, effectivePaymentIntention, unpaidCount };
        });
    }, [leads, selectedGroupName, monthlyGroups]);

    // Apply Filters for the current view
    const visibleLeads = useMemo(() => {
        let filtered = mappedLeads.filter(l => {
            let matchTab = false;
            if (activeMainTab === 'NON_ENROLLED') {
                matchTab = l.effectiveEnrollmentStatus === 'NON_ENROLLED';
            } else if (activeMainTab === 'DROPPED') {
                matchTab = l.effectiveEnrollmentStatus === 'DROPPED';
            } else {
                matchTab = l.effectiveEnrollmentStatus === 'ENROLLED' && l.effectivePaymentIntention === activeMainTab;
            }

            if (!matchTab) return false;

            const matchPhase = activePhase === 'ALL' ? true : (Number(l.phase) || 1) === activePhase;
            const matchSearch = searchQuery ? (l.phone && l.phone.includes(searchQuery)) || (l.name && l.name.toLowerCase().includes(searchQuery.toLowerCase())) : true;
            let matchAttempt = true;
            if (activeAttemptFilter !== 'ALL') {
                matchAttempt = (l.callAttempt || 1) === activeAttemptFilter && !isLeadPending(l);
            }
            
            return matchPhase && matchSearch && matchAttempt;
        });

        if (statusFilter === 'PENDING') {
            filtered = filtered.filter(isLeadPending);
        }

        filtered.sort((a, b) => {
            return a.id - b.id;
        });

        return filtered;
    }, [mappedLeads, activeMainTab, activePhase, searchQuery, statusFilter, activeAttemptFilter, monthlyGroups, selectedGroupName]);

    const leadsInActiveTab = useMemo(() => {
        return mappedLeads.filter(l => {
            if (activeMainTab === 'NON_ENROLLED') return l.effectiveEnrollmentStatus === 'NON_ENROLLED';
            if (activeMainTab === 'DROPPED') return l.effectiveEnrollmentStatus === 'DROPPED';
            return l.effectiveEnrollmentStatus === 'ENROLLED' && l.effectivePaymentIntention === activeMainTab;
        });
    }, [mappedLeads, activeMainTab]);

    const stats = useMemo(() => {
        const phaseLeads = leadsInActiveTab.filter(l => activePhase === 'ALL' ? true : (Number(l.phase) || 1) === activePhase);
        
        let totalAssigned = phaseLeads.length;
        let pending = phaseLeads.filter(isLeadPending).length;
        let covered = totalAssigned - pending;
        let responseRate = totalAssigned > 0 ? ((covered / totalAssigned) * 100).toFixed(1) : 0;

        return { totalAssigned, covered, pending, responseRate };
    }, [leadsInActiveTab, activePhase]);

    const totalPages = Math.ceil(visibleLeads.length / ITEMS_PER_PAGE);
    const paginatedLeads = visibleLeads.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

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
                    <button
                        onClick={() => { setActiveMainTab('DROPPED'); setActivePhase('ALL'); setCurrentPage(1); setStatusFilter('ALL'); }}
                        className={`px-6 py-2.5 rounded-xl font-black uppercase tracking-wider transition-all text-sm ${activeMainTab === 'DROPPED' ? 'bg-gradient-to-r from-red-800 to-red-950 text-white shadow-lg shadow-red-900/40' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                        DROPPED ({'>'}2 MONTHS)
                    </button>
                </div>

                <div className="flex gap-2 bg-[#0F172A]/80 p-2 rounded-2xl flex-wrap shadow-inner mb-6 w-max border border-white/5">
                    <button
                        onClick={() => { setActiveAttemptFilter('ALL'); setCurrentPage(1); }}
                        className={`px-6 py-1.5 rounded-xl font-black uppercase tracking-wider transition-all text-xs ${activeAttemptFilter === 'ALL' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                        ALL ATTEMPTS
                    </button>
                    <button
                        onClick={() => { setActiveAttemptFilter(1); setCurrentPage(1); }}
                        className={`px-6 py-1.5 rounded-xl font-black uppercase tracking-wider transition-all text-xs ${activeAttemptFilter === 1 ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                        1ST ATTEMPT
                    </button>
                    <button
                        onClick={() => { setActiveAttemptFilter(2); setCurrentPage(1); }}
                        className={`px-6 py-1.5 rounded-xl font-black uppercase tracking-wider transition-all text-xs ${activeAttemptFilter === 2 ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                        2ND ATTEMPT
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
                        </div>

                        {/* Filters & Search */}
                        <div className="flex flex-col gap-3 min-w-[300px] w-full xl:w-auto">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-2">Filters & Export:</span>
                                <button
                                    onClick={exportToCSV}
                                    className="px-4 py-2 rounded-xl text-xs font-bold transition-all bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 flex items-center gap-2"
                                >
                                    <FaDownload size={12} /> EXPORT CSV
                                </button>
                                <button
                                    onClick={() => { setStatusFilter(statusFilter === 'PENDING' ? 'ALL' : 'PENDING'); setCurrentPage(1); }}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${statusFilter === 'PENDING' ? 'bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-[#0F172A] border border-white/10 text-amber-400 hover:bg-white/5'}`}
                                >
                                    ⏳ PENDING
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
                        {Array.from(new Set(leadsInActiveTab.map(l => Number(l.phase) || 1))).sort((a, b) => a - b).map(ph => {
                            const phCount = leadsInActiveTab.filter(l => (Number(l.phase) || 1) === ph).length;
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
                                    const currentReason = reasonDrafts[lead.id] !== undefined ? reasonDrafts[lead.id] : (lead.nonEnrolledReason || '');
                                    const isDraft = drafts[lead.id] !== undefined && drafts[lead.id] !== lead.feedback;
                                    const isReasonDraft = reasonDrafts[lead.id] !== undefined && reasonDrafts[lead.id] !== lead.nonEnrolledReason;

                                    const callOutcome = lead.callStatus || 'pending';

                                    let enrollmentValue = lead.enrollmentStatus;
                                    if (lead.enrollmentStatus === 'ENROLLED') {
                                        if (lead.paymentIntention === 'FULL') enrollmentValue = 'ENROLLED_FULL';
                                        else if (lead.paymentIntention === 'MONTHLY') enrollmentValue = 'ENROLLED_MONTHLY';
                                        else if (lead.paymentIntention === 'INSTALLMENT') enrollmentValue = 'ENROLLED_INSTALLMENT';
                                    } else {
                                        enrollmentValue = 'NON_ENROLLED';
                                    }

                                    let activeGroupIndex = monthlyGroups.findIndex(g => g.name === selectedGroupName);
                                    let pastMonths = [];
                                    if (activeGroupIndex >= 0) {
                                        if (activeGroupIndex >= 2) pastMonths.push(monthlyGroups[activeGroupIndex - 2]);
                                        if (activeGroupIndex >= 1) pastMonths.push(monthlyGroups[activeGroupIndex - 1]);
                                        pastMonths.push(monthlyGroups[activeGroupIndex]);
                                    }

                                    const mdPositionClass = (index % 2 === 0) ? "md:left-0 md:right-auto md:translate-x-0" : "md:right-0 md:left-auto md:translate-x-0";
                                    const xlPositionClass = (index % 3 === 0) ? "xl:left-0 xl:right-auto xl:translate-x-0" : (index % 3 === 1) ? "xl:left-1/2 xl:right-auto xl:-translate-x-1/2" : "xl:right-0 xl:left-auto xl:translate-x-0";
                                    const tooltipPositionClass = `left-0 ${mdPositionClass} ${xlPositionClass}`;

                                    return (
                                        <div key={lead.id} className="bg-[#1e1b4b]/80 backdrop-blur-md rounded-2xl border border-indigo-500/20 p-5 shadow-xl hover:border-indigo-400/50 transition-all group flex flex-col relative hover:z-[200]">
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
                                                            {/* Attempt Badge */}
                                                            <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow-sm border ${callOutcome !== 'pending' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-slate-700/30 text-slate-500 border-slate-600/30'}`}>
                                                                {lead.callAttempt === 2 ? '2ND ATTEMPT' : '1ST ATTEMPT'}
                                                            </span>
                                                            {lead.isUpgraded && (
                                                                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow-sm border bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30">
                                                                    UPGRADED
                                                                </span>
                                                            )}
                                                            {lead.isProcessing && (
                                                                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow-sm border bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse">
                                                                    ⏳ SLIP PROCESSING
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* First Enrolled Month & Batch Info */}
                                            {(lead.firstEnrolledMonthName || lead.batch?.name) && (
                                                <div className="flex items-center gap-2 mb-3 flex-wrap">
                                                    {lead.batch?.name && (
                                                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg border bg-indigo-500/10 text-indigo-300 border-indigo-500/20">
                                                            📚 {lead.batch.name}
                                                        </span>
                                                    )}
                                                    {lead.firstEnrolledMonthName && (
                                                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg border bg-teal-500/10 text-teal-300 border-teal-500/20">
                                                            📅 Started: {lead.firstEnrolledMonthName}
                                                        </span>
                                                    )}
                                                    {lead.enrolledSubjects && lead.enrolledSubjects.length > 0 && (
                                                        <span className="text-[9px] font-bold text-slate-400 px-2 py-1">
                                                            {lead.enrolledSubjects.length} subject{lead.enrolledSubjects.length > 1 ? 's' : ''}
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Payment History section */}
                                            {lead.paymentHistory && Object.keys(lead.paymentHistory).length > 0 && (
                                                <div className="mb-4 relative group/history">
                                                    <div className="w-full cursor-default bg-slate-900/50 hover:bg-slate-800/80 border border-white/5 rounded-xl py-2 px-3 shadow-inner flex items-center justify-center gap-2 text-xs font-bold text-slate-300 transition-colors">
                                                        <BookOpen size={14} className="text-amber-400" />
                                                        HOVER TO VIEW HISTORY
                                                        {lead.isProcessing && <span className="ml-2 text-amber-400 animate-pulse">⏳</span>}
                                                    </div>
                                                    
                                                    {/* Hover Tooltip Popup */}
                                                    <div className={`hidden group-hover/history:block absolute z-[150] top-full mt-2 w-max min-w-full bg-[#0F172A] border border-slate-700 rounded-xl shadow-2xl overflow-hidden shadow-black/50 ${tooltipPositionClass}`}>
                                                        {(!lead.paymentHistory || Object.keys(lead.paymentHistory).length === 0) ? (
                                                            <div className="p-3 text-xs text-slate-400 text-center">No payment history available</div>
                                                        ) : (
                                                            <>
                                                                {/* Header with batch name and first enrolled month */}
                                                                <div className="px-3 py-2 bg-indigo-500/10 border-b border-indigo-500/20 flex items-center justify-between gap-4">
                                                                    <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">
                                                                        {lead.batch?.name || 'Batch'}
                                                                    </span>
                                                                    {lead.firstEnrolledMonthName && (
                                                                        <span className="text-[10px] font-bold text-teal-400">
                                                                            First Enrolled: {lead.firstEnrolledMonthName}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <table className="w-full text-left text-xs whitespace-nowrap">
                                                                    <thead className="bg-slate-900/80 text-[10px] uppercase font-bold text-slate-400">
                                                                        <tr>
                                                                            <th className="px-3 py-2 border-b border-white/5">Subject</th>
                                                                            {Object.keys(lead.paymentHistory[Object.keys(lead.paymentHistory)[0]]).map((month, mIdx, arr) => (
                                                                                <th key={month} className={`px-3 py-2 border-b border-white/5 ${mIdx === arr.length - 1 ? 'text-amber-400 bg-amber-500/5' : ''}`}>
                                                                                    {month} {mIdx === arr.length - 1 ? '⬅' : ''}
                                                                                </th>
                                                                            ))}
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="text-slate-300">
                                                                        {Object.keys(lead.paymentHistory).map((subject, index) => (
                                                                            <tr key={index} className="hover:bg-white/5 transition-colors">
                                                                                <td className="px-3 py-2 border-b border-white/5 font-bold text-indigo-200">
                                                                                    {subject}
                                                                                </td>
                                                                                {Object.entries(lead.paymentHistory[subject]).map(([month, status], sIdx, sArr) => (
                                                                                    <td key={month} className={`px-3 py-2 border-b border-white/5 ${sIdx === sArr.length - 1 ? 'bg-amber-500/5' : ''}`}>
                                                                                        {status === 'PAID' && <span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border border-emerald-500/30">✅ PAID</span>}
                                                                                        {status === 'PROCESSING' && <span className="bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border border-amber-500/30 animate-pulse">⏳ PROCESSING</span>}
                                                                                        {status === 'NOT PAID' && <span className="bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border border-rose-500/30">❌ NOT PAID</span>}
                                                                                    </td>
                                                                                ))}
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

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
                                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1 flex items-center gap-1">Enrollment <Lock size={10} className="text-slate-500" /></label>
                                                    <div className={`w-full bg-[#312e81]/30 border rounded-xl px-3 py-2 text-[11px] h-[34px] flex items-center font-bold outline-none appearance-none gap-1.5 ${lead.enrollmentStatus === 'ENROLLED' ? 'text-emerald-400 border-emerald-500/30' : lead.isProcessing ? 'text-amber-400 border-amber-500/30' : 'text-rose-400 border-rose-500/30'}`}>
                                                        {lead.enrollmentStatus === 'ENROLLED' 
                                                            ? `✅ ENROLLED - ${lead.paymentIntention}` 
                                                            : lead.isProcessing 
                                                                ? '⏳ PROCESSING' 
                                                                : '❌ NON ENROLLED'}
                                                    </div>
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

                                            {(activeMainTab === 'NON_ENROLLED' || activeMainTab === 'DROPPED') && (
                                                <div className="mb-4 relative flex-1 flex flex-col">
                                                    <label className="block text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-1 ml-1">Non-Enrolled Reason</label>
                                                    <textarea
                                                        rows="2"
                                                        value={currentReason}
                                                        onChange={(e) => handleDraftReason(lead.id, e.target.value)}
                                                        placeholder="Why are they not enrolled?"
                                                        className="w-full flex-1 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2 text-xs text-rose-300 outline-none focus:border-rose-500 resize-none placeholder-rose-300/30 transition-colors custom-scrollbar"
                                                    />
                                                    {isReasonDraft && <span className="absolute -top-2 right-2 bg-yellow-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded border border-yellow-400 shadow-sm">DRAFT</span>}
                                                </div>
                                            )}

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

            {/* HISTORY WIDGET MODAL */}
            {showHistoryModal && historyLead && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-[#111827] border border-slate-700 rounded-3xl w-full max-w-2xl p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-5 border-b border-slate-800 pb-3">
                            <h3 className="text-white font-bold flex items-center gap-2 text-lg">
                                <BookOpen className="text-indigo-400"/> Enrollment History
                            </h3>
                            <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-rose-400 bg-white/5 hover:bg-white/10 p-2 rounded-lg transition-colors"><FaTimes size={14}/></button>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-xl flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 flex justify-center items-center font-black text-xs shrink-0"><FaLayerGroup size={14}/></div>
                                <div className="overflow-hidden flex-1">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <p className="text-sm font-bold text-white tracking-wide truncate">{historyLead.phone}</p>
                                    {historyLead.isProcessing && (
                                        <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded shadow-[0_0_10px_rgba(245,158,11,0.2)] animate-pulse">
                                            ⏳ SLIP PROCESSING
                                        </span>
                                    )}
                                    {historyLead.batch?.name && (
                                        <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded">
                                            📚 {historyLead.batch.name}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <p className="text-[10px] text-indigo-400 uppercase tracking-widest truncate">{historyLead.name || 'Student'}</p>
                                    {historyLead.firstEnrolledMonthName && (
                                        <span className="text-[10px] text-teal-400 font-bold">
                                            📅 Started: {historyLead.firstEnrolledMonthName}
                                        </span>
                                    )}
                                </div>
                                </div>
                            </div>

                            <div className="overflow-x-auto rounded-xl border border-white/5 bg-[#0F172A]">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    {(!historyLead.paymentHistory || Object.keys(historyLead.paymentHistory).length === 0) ? (
                                        <tbody><tr><td className="p-4 text-center text-slate-400">No payment history available</td></tr></tbody>
                                    ) : (
                                        <>
                                            <thead className="bg-slate-900/80 text-xs uppercase font-bold text-slate-400">
                                                <tr>
                                                    <th className="px-4 py-3 border-b border-white/5">Subject</th>
                                                    {Object.keys(historyLead.paymentHistory[Object.keys(historyLead.paymentHistory)[0]]).map((month, mIdx, arr) => (
                                                        <th key={month} className={`px-4 py-3 border-b border-white/5 ${mIdx === arr.length - 1 ? 'text-amber-400 bg-amber-500/5' : ''}`}>
                                                            {month} {mIdx === arr.length - 1 ? '⬅ Active' : ''}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="text-slate-300">
                                                {Object.keys(historyLead.paymentHistory).map((subject, index) => (
                                                    <tr key={index} className="hover:bg-white/5 transition-colors">
                                                        <td className="px-4 py-3 border-b border-white/5 font-bold text-indigo-200">
                                                            {subject}
                                                        </td>
                                                        {Object.entries(historyLead.paymentHistory[subject]).map(([month, status], sIdx, sArr) => (
                                                            <td key={month} className={`px-4 py-3 border-b border-white/5 ${sIdx === sArr.length - 1 ? 'bg-amber-500/5' : ''}`}>
                                                                {status === 'PAID' && <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest">✅ PAID</span>}
                                                                {status === 'PROCESSING' && <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest animate-pulse">⏳ PROCESSING</span>}
                                                                {status === 'NOT PAID' && <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest">❌ NOT PAID</span>}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </>
                                    )}
                                </table>
                            </div>
                            
                            <button onClick={() => setShowHistoryModal(false)} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs uppercase tracking-widest py-3 rounded-xl transition-all shadow-lg shadow-slate-900/20 mt-4">
                                Close Window
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
