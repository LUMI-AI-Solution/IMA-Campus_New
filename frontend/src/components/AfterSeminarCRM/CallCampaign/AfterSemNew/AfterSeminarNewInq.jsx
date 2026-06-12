import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import axios from '../../../../api/axios';
import { FaSearch, FaCommentDots, FaArrowRight, FaTimes, FaBell, FaSave, FaTrash, FaCheckCircle } from 'react-icons/fa';
import { Target, PhoneCall, Check, Loader, BookOpen, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';


const getShiftData = (dateString) => {
    if (!dateString) return { dateStr: 'Unknown', label: 'Unknown Date', timestamp: 0 };
    const d = new Date(dateString);
    const shiftDate = new Date(d);
    if (d.getHours() < 8) shiftDate.setDate(shiftDate.getDate() - 1);
    shiftDate.setHours(0, 0, 0, 0);
    const now = new Date();
    const todayShift = new Date(now);
    if (now.getHours() < 8) todayShift.setDate(todayShift.getDate() - 1);
    todayShift.setHours(0, 0, 0, 0);
    const yesterdayShift = new Date(todayShift);
    yesterdayShift.setDate(yesterdayShift.getDate() - 1);
    if (shiftDate.getTime() === todayShift.getTime()) return { label: 'Today', timestamp: shiftDate.getTime() };
    else if (shiftDate.getTime() === yesterdayShift.getTime()) return { label: 'Yesterday', timestamp: shiftDate.getTime() };
    else return { label: shiftDate.toLocaleDateString('en-CA'), timestamp: shiftDate.getTime() };
};

export default function AfterSeminarNewInq({ leads, allBatches, filters, drafts, setDrafts, handleUpdateLocalLead, handleSaveCallData, setChatModalLead, isManager, handleTempUnlock, externalSearch }) {

    const [activeRound, setActiveRound] = useState('r1');
    const [activePhase, setActivePhase] = useState(1);
    const [searchQuery, setSearchQuery] = useState(externalSearch || '');
    const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, PENDING, DELAYED
    const [currentPage, setCurrentPage] = useState(1);
    const [isGuidanceModalOpen, setIsGuidanceModalOpen] = useState(false);
    const [guidanceLang, setGuidanceLang] = useState('SI');

    const [showReminder, setShowReminder] = useState(false);
    const [reminderLead, setReminderLead] = useState(null);
    const [existingReminderId, setExistingReminderId] = useState(null);
    const [remindDate, setRemindDate] = useState('');
    const [remindTime, setRemindTime] = useState('');
    const [remindNote, setRemindNote] = useState('');
    const [isSubmittingReminder, setIsSubmittingReminder] = useState(false);

    const ITEMS_PER_PAGE = 20;

    const openSemLeads = Array.isArray(leads) ? leads.filter(l => l?.inquiryType === 'NEW_INQ') : [];

    const isLeadDelayed = (l) => {
        if (l.enrollmentStatus === 'ENROLLED') return false;
        if (!isLeadPending(l)) return false; 
        const startTime = l.updatedAt ? new Date(l.updatedAt).getTime() : new Date(l.assignedAt || l.createdAt).getTime();
        const now = new Date().getTime();
        const diffHours = (now - startTime) / (1000 * 60 * 60);
        return diffHours >= 24; 
    };

    const isLeadPending = (l) => {
        return !['answered', 'reject'].includes(l.callStatus);
    };

    const filteredLeads = useMemo(() => {
        let filtered = openSemLeads;

        if (activeRound === 'enrolled') {
            filtered = filtered.filter(l => l?.enrollmentStatus === 'ENROLLED');
        } else if (activeRound === 'non_enrolled') {
            filtered = filtered.filter(l => l?.enrollmentStatus !== 'ENROLLED' && l?.inquiryType === 'NORMAL');
        } else {
            filtered = filtered.filter(l => l?.enrollmentStatus !== 'ENROLLED' && l?.inquiryType === 'NEW_INQ');
            if (activeRound === 'r1') filtered = filtered.filter(l => (l?.coordinationRound || 1) === 1);
            if (activeRound === 'r2') filtered = filtered.filter(l => l?.coordinationRound === 2);
        }

        if (activePhase !== 'ALL') filtered = filtered.filter(l => l?.phase === activePhase);

        if (statusFilter === 'PENDING') {
            filtered = filtered.filter(isLeadPending);
        } else if (statusFilter === 'DELAYED') {
            filtered = filtered.filter(isLeadDelayed);
        }

        if (searchQuery) {
            const sq = searchQuery.toLowerCase();
            filtered = filtered.filter(l => l?.phone?.includes(sq) || (l?.name && l?.name?.toLowerCase().includes(sq)));
        }

        filtered.sort((a, b) => {
            const aTime = new Date(a?.assignedAt || a?.createdAt || 0).getTime();
            const bTime = new Date(b?.assignedAt || b?.createdAt || 0).getTime();
            return bTime - aTime;
        });

        return filtered;
    }, [openSemLeads, activeRound, activePhase, statusFilter, searchQuery]);

    const stats = useMemo(() => {
        let baseLeads = openSemLeads;
        if (activeRound === 'enrolled') {
            baseLeads = baseLeads.filter(l => l?.enrollmentStatus === 'ENROLLED');
        } else if (activeRound === 'non_enrolled') {
            baseLeads = baseLeads.filter(l => l?.enrollmentStatus !== 'ENROLLED' && l?.inquiryType === 'NORMAL');
        } else {
            baseLeads = baseLeads.filter(l => l?.enrollmentStatus !== 'ENROLLED' && l?.inquiryType === 'NEW_INQ');
            if (activeRound === 'r1') baseLeads = baseLeads.filter(l => (l?.coordinationRound || 1) === 1);
            if (activeRound === 'r2') baseLeads = baseLeads.filter(l => l?.coordinationRound === 2);
        }

        if (activePhase !== 'ALL') baseLeads = baseLeads.filter(l => l?.phase === activePhase);

        let totalAssigned = baseLeads.length;
        let pending = baseLeads.filter(isLeadPending).length;
        let covered = totalAssigned - pending;
        let responseRate = totalAssigned > 0 ? ((covered / totalAssigned) * 100).toFixed(1) : 0;
        let delayed = baseLeads.filter(isLeadDelayed).length;

        return { totalAssigned, covered, pending, responseRate, delayed };
    }, [openSemLeads, activeRound, activePhase]);

    const totalPages = Math.ceil(filteredLeads.length / ITEMS_PER_PAGE);

    const groupedLeads = useMemo(() => {
        const groups = {};
        filteredLeads.forEach(lead => {
            if (!lead) return;
            let targetDate = lead.assignedAt || lead.newInqTimestamp || lead.createdAt;
            if (lead.phase > 1 || (lead.coordinationRound || 1) > 1 || (lead.callStatus && lead.callStatus !== 'pending')) {
                targetDate = lead.roundProgress?.[0]?.updatedAt || lead.assignedAt || lead.newInqTimestamp || lead.createdAt;
            }
            const shiftInfo = getShiftData(targetDate);
            const label = shiftInfo.label;
            if (!groups[label]) groups[label] = { label: label, timestamp: shiftInfo.timestamp, leads: [] };
            groups[label].leads.push(lead);
        });
        return Object.values(groups).sort((a, b) => b.timestamp - a.timestamp);
    }, [filteredLeads]);

    const paginatedLeads = filteredLeads.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const handleRemarkChange = (leadId, value) => {
        setDrafts(prev => ({ ...prev, [leadId]: value }));
        localStorage.setItem(`draft_remark_as_${leadId}`, value);
    };

    const handleEnrollmentChange = (leadId, val) => {
        if (val === 'NON_ENROLLED') {
            handleUpdateLocalLead(leadId, 'paymentIntention', 'NOT_DECIDED');
        } else {
            const plan = val.split('_')[1]; // FULL, MONTHLY, INSTALLMENT
            handleUpdateLocalLead(leadId, 'paymentIntention', plan);
        }
    };

    const handleLocalSaveCallData = async (leadId) => {
        const lead = leads.find(l => l.id === leadId);
        const feedback = drafts[leadId] || lead.feedback || '';
        const finalStatus = lead.callStatus || 'pending';

        if (finalStatus === 'pending') {
            toast.error('Please select an Outcome before saving.');
            return;
        }

        const loadToast = toast.loading("Saving progress...");
        try {
            const token = localStorage.getItem('token');
            await axios.post('/after-seminar-crm/leads/update-call', {
                leadId,
                method: lead.callMethod || 'direct',
                status: finalStatus,
                feedback,
                coordinationRound: lead.coordinationRound || 1,
                paymentIntention: lead.paymentIntention || 'NOT_DECIDED',
                enrollmentStatus: lead.enrollmentStatus || 'NON_ENROLLED'
            }, { headers: { Authorization: `Bearer ${token}` } });

            toast.success("Progress saved successfully!", { id: loadToast });

            const newDrafts = { ...drafts };
            delete newDrafts[leadId];
            setDrafts(newDrafts);
            localStorage.removeItem(`draft_remark_as_${leadId}`);

            handleUpdateLocalLead(leadId, 'feedback', feedback);
            if (lead.phase === 1 && finalStatus === 'no_answer') {
                handleUpdateLocalLead(leadId, 'phase', 2);
            }
        } catch (error) {
            toast.error("Failed to save progress.", { id: loadToast });
        }
    };

    const handlePushToNextRound = async (leadId, currentRound, callStatus, phase) => {
        if (callStatus === 'pending' || !callStatus) return toast.error("Change Status before pushing!");
        if (callStatus === 'reject') return toast.error("Rejected leads cannot be pushed to the next round.");
        
        if (phase === 1 && callStatus !== 'answered') {
            return toast.error("In Phase 1, only 'Answered' leads can be pushed to the next round.");
        }
        
        if (phase === 2 && !['answered', 'no_answer'].includes(callStatus)) {
            return toast.error("In Phase 2, only 'Answered' or 'No Answer' leads can be pushed to the next round.");
        }

        if (!window.confirm(`Move this lead to the next round? Remarks will be kept, but status will reset.`)) return;

        const loadToast = toast.loading("Moving lead to next round...");
        try {
            await axios.post('/after-seminar-crm/leads/bulk-action', { action: 'CHANGE_ROUND', leadIds: [leadId], targetRound: currentRound + 1 }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
            toast.success("Lead pushed successfully!", { id: loadToast });
            setTimeout(() => window.location.reload(), 800);
        } catch (e) { toast.error("Failed to push lead.", { id: loadToast }); }
    };

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

    const getTimerDataText = (lead) => {
        if (!lead) return null;
        if (lead.enrollmentStatus === 'ENROLLED') return null;

        const startTime = lead.updatedAt ? new Date(lead.updatedAt).getTime() : new Date(lead.assignedAt || lead.createdAt).getTime();
        const now = new Date().getTime();
        const diffHours = (now - startTime) / (1000 * 60 * 60);
        
        const isPending = isLeadPending(lead);
        const currentRound = lead.coordinationRound || 1;

        if (isPending) {
            const timeLeft = 24 - diffHours;
            if (timeLeft > 0) {
                const hrs = Math.floor(timeLeft);
                const mins = Math.floor((timeLeft - hrs) * 60);
                return { text: `⏳ ${hrs}h ${mins}m LEFT`, isLate: false };
            } else {
                const lateHours = Math.abs(timeLeft);
                const hrs = Math.floor(lateHours);
                const mins = Math.floor((lateHours - hrs) * 60);
                return { text: `⚠️ -${hrs}h ${mins}m LATE`, isLate: true };
            }
        } else {
            const maxWaitHours = currentRound === 1 ? 120 : 168;
            const timeLeft = maxWaitHours - diffHours;
            if (timeLeft <= 0) return { text: `✅ READY FOR NEXT`, isLate: false };
            const days = Math.floor(timeLeft / 24);
            const hrs = Math.floor(timeLeft % 24);
            return { text: `NEXT IN ${days}d ${hrs}h`, isLate: false };
        }
    };

    return (
        <div className="w-full h-full flex flex-col bg-transparent overflow-y-auto custom-scrollbar font-sans text-slate-100">
            <div className="fade-in">

                {/* Header matching CallCenterAgentDashboard detail view */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-white/5 pb-4">
                    <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-400 to-indigo-400 flex items-center gap-3">
                        <Target className="text-emerald-400" />
                        NEW INQUIRY CAMPAIGN
                    </h1>
                    <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-xl backdrop-blur-md shadow-sm">
                        <span className="text-xs font-bold text-slate-400">Campaign:</span>
                        <span className="text-sm font-black text-emerald-400">NEW INQUIRY</span>
                        <div className="w-px h-5 bg-white/10 mx-1"></div>
                        <button
                            onClick={() => setIsGuidanceModalOpen(true)}
                            className="flex items-center gap-2 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 hover:text-indigo-200 border border-indigo-500/30 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
                        >
                            <BookOpen size={14} /> Read Guidance
                        </button>
                    </div>
                </div>

                {/* Top Round Buttons (Moved Outside) */}
                <div className="flex gap-2 bg-[#0F172A]/80 p-2 rounded-2xl flex-wrap shadow-inner mb-6 w-max border border-white/5">
                    <button
                        onClick={() => { setActiveRound('r1'); setActivePhase(1); setCurrentPage(1); setStatusFilter('ALL'); }}
                        className={`px-6 py-2.5 rounded-xl font-black uppercase tracking-wider transition-all text-sm ${activeRound === 'r1' ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                        Round 01
                    </button>
                    <button
                        onClick={() => { setActiveRound('r2'); setActivePhase(1); setCurrentPage(1); setStatusFilter('ALL'); }}
                        className={`px-6 py-2.5 rounded-xl font-black uppercase tracking-wider transition-all text-sm ${activeRound === 'r2' ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                        Round 02
                    </button>
                    <button
                        onClick={() => { setActiveRound('non_enrolled'); setActivePhase('ALL'); setCurrentPage(1); setStatusFilter('ALL'); }}
                        className={`px-6 py-2.5 rounded-xl font-black uppercase tracking-wider transition-all text-sm ${activeRound === 'non_enrolled' ? 'bg-gradient-to-r from-slate-600 to-slate-700 text-white shadow-lg shadow-slate-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                        Non Enrolled
                    </button>
                    <button
                        onClick={() => { setActiveRound('enrolled'); setActivePhase('ALL'); setCurrentPage(1); setStatusFilter('ALL'); }}
                        className={`px-6 py-2.5 rounded-xl font-black uppercase tracking-wider transition-all text-sm ${activeRound === 'enrolled' ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                        Paid
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
                        {[1, 2].map(ph => {
                            let phLeads = openSemLeads;
                            if (activeRound === 'r1') phLeads = phLeads.filter(l => (l?.coordinationRound || 1) === 1);
                            if (activeRound === 'r2') phLeads = phLeads.filter(l => l?.coordinationRound === 2);
                            const phCount = phLeads.filter(l => l.phase === ph).length;

                            return (
                                <button
                                    key={ph}
                                    onClick={() => { setActivePhase(ph); setCurrentPage(1); }}
                                    className={`flex flex-col items-center justify-center py-4 px-6 lg:px-0 rounded-2xl transition-all relative overflow-hidden min-w-[100px] lg:min-w-0 ${activePhase === ph
                                        ? 'bg-gradient-to-b from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/20'
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
                        {paginatedLeads.length === 0 ? (
                            <div className="text-center py-20 bg-white/5 border border-white/10 rounded-3xl shadow-lg">
                                <PhoneCall className="text-slate-600 mx-auto mb-4" size={48} />
                                <h3 className="text-xl font-bold text-slate-400">No Leads Found</h3>
                                <p className="text-slate-500 mt-2">There are no leads matching your current filters.</p>
                            </div>
                        ) : (
                            <div className="space-y-8 pb-10">
                                {groupedLeads.map((group, gIdx) => (
                                    <div key={gIdx} className="space-y-4">
                                        <div className="sticky top-0 z-10 py-2 backdrop-blur-sm mb-4">
                                            <div className="flex justify-between items-center relative py-2.5">
                                                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-transparent border-l-4 border-emerald-500 rounded-r-2xl shadow-sm"></div>
                                                <div className="relative px-5 flex items-center gap-2">
                                                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-emerald-400 drop-shadow-md">
                                                        {group.label}
                                                    </h3>
                                                </div>
                                                <div className="relative px-5">
                                                    <div className="text-xs font-bold text-emerald-200 bg-emerald-500/20 px-4 py-1 rounded-full border border-emerald-500/30 shadow-inner">
                                                        {group.leads.length} Leads
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                            {group.leads.map((lead, index) => {
                                                const realIndex = index + 1;
                                    const currentRemark = drafts[lead.id] !== undefined ? drafts[lead.id] : (lead.feedback || '');
                                    const isDraft = drafts[lead.id] !== undefined && drafts[lead.id] !== lead.feedback;

                                    const callOutcome = lead.callStatus || 'pending';
                                    const canPushRound = activeRound !== 'enrolled' && activeRound !== 'non_enrolled' && (
                                        (lead.phase === 1 && callOutcome === 'answered') ||
                                        (lead.phase === 2 && (callOutcome === 'answered' || callOutcome === 'no_answer'))
                                    );

                                    let enrollmentValue = 'NON_ENROLLED';
                                    if (lead.paymentIntention === 'FULL') enrollmentValue = 'ENROLLED_FULL';
                                    else if (lead.paymentIntention === 'MONTHLY') enrollmentValue = 'ENROLLED_MONTHLY';
                                    else if (lead.paymentIntention === 'INSTALLMENT') enrollmentValue = 'ENROLLED_INSTALLMENT';
                                    else enrollmentValue = 'NON_ENROLLED';

                                    const timerData = getTimerDataText(lead);

                                    return (
                                        <div key={lead.id} className="bg-[#1e1b4b]/80 backdrop-blur-md rounded-2xl border border-indigo-500/20 p-5 shadow-xl hover:border-indigo-400/50 transition-all group flex flex-col">
                                            {/* Top Section */}
                                            <div className="flex justify-between items-start mb-4 pb-4 border-b border-indigo-500/20">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-black shadow-inner relative">
                                                        {realIndex}
                                                    </div>
                                                    <div>
                                                        <h3 className="text-lg font-black text-white leading-tight tracking-wide">{lead.phone?.split('_')[0]}</h3>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <p className="text-slate-400 text-[10px] font-bold uppercase truncate max-w-[120px]">~ {lead.name || 'Unknown'}</p>
                                                            {timerData && (
                                                                <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow-sm border ${timerData.isLate ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
                                                                    {timerData.text}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Grid for Outcome, Attempt, and Open Sem Fields */}
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
                                                        onChange={(e) => handleEnrollmentChange(lead.id, e.target.value)}
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
                                                    onChange={(e) => handleRemarkChange(lead.id, e.target.value)}
                                                    placeholder="Add your notes..."
                                                    className="w-full flex-1 bg-[#312e81]/30 border border-indigo-500/20 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-indigo-500 resize-none placeholder-indigo-300/30 transition-colors custom-scrollbar"
                                                />
                                                {isDraft && <span className="absolute -top-2 right-2 bg-yellow-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded border border-yellow-400 shadow-sm">DRAFT</span>}
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleLocalSaveCallData(lead.id)}
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
                                                    {lead.unreadCount > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping"></span>}
                                                    {lead.unreadCount > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border border-[#1e1b4b]"></span>}
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
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex justify-center items-center gap-4 mt-8 bg-white/5 border border-white/10 p-3 rounded-2xl w-max mx-auto shadow-sm backdrop-blur-sm">
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

            {/* Guidance Modal */}
            {isGuidanceModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#0f172a] border border-indigo-500/30 w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">

                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-indigo-900/50 to-transparent">
                            <h2 className="text-xl font-extrabold text-white flex items-center gap-3">
                                <BookOpen className="text-indigo-400" />
                                Open Seminar Staff Guidance
                            </h2>
                            <div className="flex items-center gap-4">
                                <div className="flex bg-black/40 rounded-xl p-1 border border-white/10">
                                    <button
                                        onClick={() => setGuidanceLang('SI')}
                                        className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${guidanceLang === 'SI' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        සිංහල
                                    </button>
                                    <button
                                        onClick={() => setGuidanceLang('EN')}
                                        className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${guidanceLang === 'EN' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        English
                                    </button>
                                </div>
                                <button onClick={() => setIsGuidanceModalOpen(false)} className="text-slate-400 hover:text-white p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
                                    <FaTimes size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="p-8 overflow-y-auto flex-1 space-y-6 text-sm text-slate-300 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

                            {guidanceLang === 'EN' ? (
                                <>
                                    <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                                        <h3 className="text-indigo-400 font-black uppercase tracking-widest mb-3 flex items-center gap-2">📌 What is Open Seminar?</h3>
                                        <p className="leading-relaxed">
                                            The Open Seminar campaign tracks students who have inquired specifically about our opening seminars or normal inquiries who haven't enrolled yet. Your primary goal is to guide them, answer their questions, and successfully enroll them into a payment plan.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                                            <h3 className="text-emerald-400 font-black uppercase tracking-widest mb-3 flex items-center gap-2">🔄 Round 01 vs Round 02</h3>
                                            <ul className="list-disc list-inside space-y-3 marker:text-emerald-500">
                                                <li><strong className="text-white">Round 01:</strong> All fresh leads start here. You must call them and set an outcome.</li>
                                                <li><strong className="text-white">Round 02:</strong> Leads that were pushed from Round 01 for further follow-up. They have a fresh status in Round 02, but previous remarks are kept.</li>
                                                <li><strong className="text-white">Non Enrolled:</strong> Normal inquiries that are not yet enrolled.</li>
                                                <li><strong className="text-white">Paid:</strong> Leads that have successfully enrolled (Full, Monthly, or Installment).</li>
                                            </ul>
                                        </div>

                                        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                                            <h3 className="text-blue-400 font-black uppercase tracking-widest mb-3 flex items-center gap-2">📈 Phase Progression</h3>
                                            <ul className="list-disc list-inside space-y-3 marker:text-blue-500">
                                                <li><strong className="text-white">Phase 1:</strong> Initial contact stage. Fresh leads wait here.</li>
                                                <li><strong className="text-white">Phase 2:</strong> Once you change the status from 'Pending' and click SAVE, the lead automatically moves to Phase 2.</li>
                                                <li><strong className="text-white">Phase 3:</strong> Final follow-up stage (if applicable). Currently, Phase 2 is the primary active state after Phase 1.</li>
                                            </ul>
                                        </div>
                                    </div>

                                    <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                                        <h3 className="text-amber-400 font-black uppercase tracking-widest mb-3 flex items-center gap-2">⚠️ Delay Tracking & Countdown</h3>
                                        <p className="mb-3">Leads have a strict <strong>5-Day (120 Hours)</strong> deadline to be processed.</p>
                                        <ul className="list-disc list-inside space-y-2 marker:text-amber-500">
                                            <li>The timer counts down from 5 days based on when the lead was assigned.</li>
                                            <li>If the timer turns <strong className="text-rose-400">RED</strong> and says "LATE", the lead has exceeded the 5-day limit and is marked as Delayed.</li>
                                            <li><strong className="text-white">Goal:</strong> Clear the "Pending" leads before they hit the delay threshold.</li>
                                        </ul>
                                    </div>

                                    <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                                        <h3 className="text-rose-400 font-black uppercase tracking-widest mb-3 flex items-center gap-2">✅ How to Process a Lead</h3>
                                        <ol className="list-decimal list-inside space-y-2 marker:text-rose-500">
                                            <li>Select the <strong>Call Outcome</strong> (e.g. Answered, No Answer, Reject).</li>
                                            <li>Select the <strong>Call Method</strong> you used (Direct, WhatsApp, 3CX).</li>
                                            <li>Set the <strong>Enrollment Status</strong> (Full, Monthly, Installment). If they enroll, they move to the "Paid" tab.</li>
                                            <li>Type your <strong>Remarks</strong> in the text box. (It auto-saves as a Draft).</li>
                                            <li>Click <strong className="text-white">SAVE PROGRESS</strong>. The lead will move to Phase 2 automatically!</li>
                                            <li>To push a lead to the next Round, use the yellow arrow button after changing the status.</li>
                                        </ol>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                                        <h3 className="text-indigo-400 font-black uppercase tracking-widest mb-3 flex items-center gap-2">📌 Open Seminar කියන්නේ මොකක්ද?</h3>
                                        <p className="leading-relaxed">
                                            Open Seminar Campaign එකෙන් පෙන්නන්නේ අපි කරන Open Seminars වලට සම්බන්ධ වෙන්න අහපු ළමයි සහ තාමත් පන්ති වලට ලියාපදිංචි (Enroll) වුණේ නැති සාමාන්‍ය inquiries. ඔයාගේ ප්‍රධාන අරමුණ මේ ළමයින්ට කතා කරලා, එයාලව Payment Plan එකකට ඇතුළත් කරගන්න එකයි.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                                            <h3 className="text-emerald-400 font-black uppercase tracking-widest mb-3 flex items-center gap-2">🔄 Round 01 සහ Round 02</h3>
                                            <ul className="list-disc list-inside space-y-3 marker:text-emerald-500">
                                                <li><strong className="text-white">Round 01:</strong> අලුතින් එන හැම Lead එකක්ම මුලින්ම එන්නේ මෙතැනට. ඔයා මේ අයට කතා කරලා Outcome එකක් දාන්න ඕනෙ.</li>
                                                <li><strong className="text-white">Round 02:</strong> Round 01 එකෙන් කතා කරලා ඉවර වෙලා ඊලඟ වටයේ කතා කරන්න "Push" කරපු Leads තියෙන්නේ මෙතැන. මේකෙදි Status එක අලුත් වෙනවා, හැබැයි පරණ Remarks එහෙම්ම තියෙනවා.</li>
                                                <li><strong className="text-white">Non Enrolled:</strong> සාමාන්‍යයෙන් ඇවිත් තාමත් පන්ති වලට නොබැඳුණු ළමයි.</li>
                                                <li><strong className="text-white">Paid:</strong> සල්ලි ගෙවලා සම්පූර්ණයෙන් Enroll වුණු ළමයි.</li>
                                            </ul>
                                        </div>

                                        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                                            <h3 className="text-blue-400 font-black uppercase tracking-widest mb-3 flex items-center gap-2">📈 Phase වෙනස් වන ආකාරය</h3>
                                            <ul className="list-disc list-inside space-y-3 marker:text-blue-500">
                                                <li><strong className="text-white">Phase 1:</strong> අලුතින් ආපු ළමයින්ට කතා කරන්න කලින් ඉන්නේ Phase 1 එකේ.</li>
                                                <li><strong className="text-white">Phase 2:</strong> ඔයා Lead එකේ Status එක 'Pending' එකෙන් වෙනස් කරලා "SAVE PROGRESS" ඔබපු ගමන්, ඒ Lead එක Auto Phase 2 එකට මාරු වෙනවා.</li>

                                            </ul>
                                        </div>
                                    </div>

                                    <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                                        <h3 className="text-amber-400 font-black uppercase tracking-widest mb-3 flex items-center gap-2">⚠️ Delay Tracking සහ Countdown එක</h3>
                                        <p className="mb-3">හැම Lead එකකටම අනිවාර්යයෙන් දවස් 5ක (පැය 120ක) කාලයක් තියෙනවා Action එකක් ගන්න.</p>
                                        <ul className="list-disc list-inside space-y-2 marker:text-amber-500">
                                            <li>Lead එක ආපු වෙලාවේ ඉඳන් දවස් 5ක Countdown එකක් යන්න පටන් ගන්නවා.</li>
                                            <li>දවස් 5 පැන්නට පස්සේ Timer එක <strong className="text-rose-400">රතු පාටින්</strong> "LATE" කියලා වැටෙනවා. ඒ කියන්නේ ඒ Lead එක Delayed විදිහට මාර්ක් වෙනවා.</li>
                                            <li><strong className="text-white">අරමුණ:</strong> මේ දවස් 5 ඉවර වෙන්න කලින් Pending Leads ඔක්කොටම කතා කරලා ඉවර කරන්න.</li>
                                        </ul>
                                    </div>

                                    <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                                        <h3 className="text-rose-400 font-black uppercase tracking-widest mb-3 flex items-center gap-2">✅ Lead එකක් Process කරන්නේ කොහොමද?</h3>
                                        <ol className="list-decimal list-inside space-y-2 marker:text-rose-500">
                                            <li><strong>Call Outcome</strong> එක තෝරන්න (Answered, No Answer, Reject වගේ).</li>
                                            <li>කතා කරපු <strong>Call Method</strong> එක තෝරන්න (Direct, WhatsApp, 3CX).</li>
                                            <li><strong>Enrollment Status</strong> එක තෝරන්න (Full, Monthly, Installment). මේක තේරුවොත් Lead එක කෙලින්ම "Paid" Tab එකට යනවා.</li>
                                            <li>කතා කරපු දේවල් <strong>Remarks</strong> Box එකේ Type කරන්න. (ඒක Auto Save වෙනවා).</li>
                                            <li>අවසානයට <strong className="text-white">SAVE PROGRESS</strong> Button එක ඔබන්න. (එතකොට Auto Phase 2 එකට යනවා).</li>
                                            <li>Lead එක ඊලඟ Round එකට දාන්න ඕනෙ නම්, Status එක වෙනස් කරලා තියෙන කහ පාට ඊතලය Button එක ඔබන්න.</li>
                                        </ol>
                                    </div>
                                </>
                            )}

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}