import React, { useState, useMemo, useEffect } from 'react';
import axios from '../../../../api/axios';
import toast from 'react-hot-toast';
import { FaFilter, FaSearch, FaTimes, FaCheckCircle, FaPlus, FaClock, FaExclamationTriangle } from 'react-icons/fa';

import CampaignHeader from './CampaignHeader';
import LeadCard from './LeadCard';

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

export default function AfterSeminarNewInq({ leads, allBatches, filters, drafts, setDrafts, handleUpdateLocalLead, handleSaveCallData, handleTempUnlock, setChatModalLead, isManager, externalSearch }) {
    
    const safeLeads = Array.isArray(leads) ? leads : [];
    const newInqLeads = safeLeads.filter(l => l?.inquiryType === 'NEW_INQ');

    const [activePhaseFilter, setActivePhaseFilter] = useState('ALL'); 
    const [activeCoordinationRound, setActiveCoordinationRound] = useState(1);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [typingMode, setTypingMode] = useState('en'); 
    const [showOnlyDelayed, setShowOnlyDelayed] = useState(false);
    
    const [isStatsOpen, setIsStatsOpen] = useState(false);
    const [displayLimit, setDisplayLimit] = useState(36);

    const [showAddNumbersModal, setShowAddNumbersModal] = useState(false);
    const [addSearch, setAddSearch] = useState('');
    const [addFilterStatus, setAddFilterStatus] = useState('ALL');
    const [selectedToAdd, setSelectedToAdd] = useState([]);

    const loggedUser = JSON.parse(localStorage.getItem('user') || '{}');
    const currentUserId = loggedUser?.id || 'default';
    const storageKey = `newInq_custom_rounds_${currentUserId}`;

    const [customRounds, setCustomRounds] = useState(() => {
        const saved = localStorage.getItem(storageKey);
        return saved ? JSON.parse(saved) : [];
    });

    const updateCustomRounds = (newRounds) => {
        setCustomRounds(newRounds);
        localStorage.setItem(storageKey, JSON.stringify(newRounds));
    };

    const [lastSearched, setLastSearched] = useState(null);

    useEffect(() => { 
        if (externalSearch && externalSearch !== lastSearched && newInqLeads.length > 0) {
            const query = typeof externalSearch === 'object' ? externalSearch.phone : externalSearch;
            setSearchQuery(query); 
            const targetLead = newInqLeads.find(l => l.phone === query || String(l.id) === String(query));
            if (targetLead) {
                if (targetLead.enrollmentStatus === 'ENROLLED') {
                    setActiveCoordinationRound('ENROLLED');
                } else if (targetLead.coordinationRound) {
                    setActiveCoordinationRound(targetLead.coordinationRound);
                }
                if (targetLead.phase) setActivePhaseFilter(targetLead.phase);
                setDisplayLimit(36);
                setLastSearched(externalSearch);
            }
        } 
    }, [externalSearch, newInqLeads, lastSearched]);

    const exportToExcel = () => {
        const headers = ['Name', 'Phone', 'Round', 'Phase', 'Enrollment Status', 'Payment Plan', 'Call Status', 'Feedback'];
        const rows = newInqLeads.map(l => [
            (l.name || 'Unknown').replace(/,/g, ' '),
            l.phone || '',
            l.coordinationRound || 1,
            l.phase || 1,
            l.enrollmentStatus || 'NON_ENROLLED',
            l.paymentIntention || 'NOT_DECIDED',
            l.callStatus || 'pending',
            (l.feedback || '').replace(/,/g, ' ').replace(/\n/g, ' ')
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + "\n" + rows.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `New_Inquiries_Batch_${filters?.selectedBatch || 'All'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Excel File Downloaded Successfully!");
    };

    // 🔥 Rule 02: 24 Hours SLA New Inquiries 🔥
    const calculateTimeRemaining = (lead, round) => {
        if (!lead) return null;
        let startTime = lead.updatedAt || lead.createdAt;
        
        // Phase 1 එකේ Pending ඉන්න කෙනාගේ Assigned Time එක ගන්නවා (Rule 02)
        if (round === 1 && lead.phase === 1 && (!lead.callStatus || lead.callStatus === 'pending')) {
            startTime = lead.assignedAt || lead.newInqTimestamp || lead.createdAt;
        }

        if (!startTime) return null;
        
        const diffMs = new Date().getTime() - new Date(startTime).getTime();
        
        if (!lead.callStatus || lead.callStatus === 'pending' || lead.callStatus === 'no_answer') {
            const maxMs = 24 * 60 * 60 * 1000; // පැය 24යි Call කරන්න දෙන්නේ
            const msRemaining = maxMs - diffMs;

            if (msRemaining < 0) {
                const lateMs = Math.abs(msRemaining);
                const hrs = Math.floor(lateMs / (1000 * 60 * 60));
                const mins = Math.floor((lateMs % (1000 * 60 * 60)) / (1000 * 60));
                return { text: `-${hrs}h ${mins}m LATE`, type: "danger", isLate: true, state: 'CALL_PENDING' };
            } else {
                const hrs = Math.floor(msRemaining / (1000 * 60 * 60));
                const mins = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));
                return { text: hrs > 0 ? `${hrs}h ${mins}m LEFT` : `${mins}m LEFT`, type: "warning", isLate: false, state: 'CALL_PENDING' };
            }
        } 
        else {
            const maxMs = 5 * 24 * 60 * 60 * 1000; // ඊළඟ Round එකට දවස් 5යි
            const msRemaining = maxMs - diffMs;

            if (msRemaining <= 0) {
                return { text: `READY`, type: "success", isLate: false, state: 'READY', ready: true };
            } else {
                const days = Math.floor(msRemaining / (1000 * 60 * 60 * 24));
                const hrs = Math.floor((msRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                return { text: days > 0 ? `NEXT IN ${days}d ${hrs}h` : `NEXT IN ${hrs}h`, type: "waiting", isLate: false, state: 'WAITING' };
            }
        }
    };

    const filteredLeads = useMemo(() => {
        let filtered = newInqLeads;

        if (activeCoordinationRound === 'ENROLLED') {
            filtered = filtered.filter(l => l?.enrollmentStatus === 'ENROLLED');
        } else {
            filtered = filtered.filter(l => l?.enrollmentStatus !== 'ENROLLED');
            filtered = filtered.filter(l => (l?.coordinationRound || 1) === activeCoordinationRound);
        }

        if (activePhaseFilter !== 'ALL') {
            filtered = filtered.filter(l => l?.phase === activePhaseFilter);
        }

        if (statusFilter !== 'ALL') {
            filtered = filtered.filter(l => {
                if (statusFilter === 'pending') return !l?.callStatus || l?.callStatus === 'pending';
                return l?.callStatus === statusFilter;
            });
        }

        if (showOnlyDelayed && activeCoordinationRound !== 'ENROLLED') {
            filtered = filtered.filter(l => {
                const tData = calculateTimeRemaining(l, activeCoordinationRound);
                return tData && tData.isLate;
            });
        }

        if (searchQuery) {
            const sq = searchQuery.toLowerCase();
            filtered = filtered.filter(l => l?.phone?.includes(sq) || (l?.name && l?.name?.toLowerCase().includes(sq)));
        }

        return filtered;
    }, [newInqLeads, activePhaseFilter, activeCoordinationRound, statusFilter, searchQuery, showOnlyDelayed]);

    const groupedLeads = useMemo(() => {
        const groups = {};
        
        filteredLeads.forEach(lead => {
            if (!lead) return;

            // 🔥 Rule 01 & 05: Phase 1 Pending පරණ දවසෙම තියෙනවා, Phase මාරු උනොත් (No Answer) Today එකට පනිනවා
            let targetDate = lead.assignedAt || lead.newInqTimestamp || lead.createdAt;
            
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
            
            const tData = calculateTimeRemaining(lead, activeCoordinationRound);
            if (tData && tData.isLate) groups[label].stats.delayed++;
        });

        const sortedGroups = Object.values(groups).sort((a, b) => b.timestamp - a.timestamp);

        sortedGroups.forEach(group => {
            group.leads.sort((a, b) => {
                const aPending = !a.callStatus || a.callStatus === 'pending';
                const bPending = !b.callStatus || b.callStatus === 'pending';
                if (aPending && !bPending) return -1;
                if (!aPending && bPending) return 1;
                return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
            });
        });

        return sortedGroups;
    }, [filteredLeads, activeCoordinationRound]);

    const overallStats = useMemo(() => {
        const totalAssign = newInqLeads.length;
        const totalCovered = newInqLeads.filter(l => l?.callStatus && l?.callStatus !== 'pending').length;
        const totalPending = totalAssign - totalCovered;
        const totalLate = newInqLeads.filter(l => {
            const t = calculateTimeRemaining(l, l?.coordinationRound || 1);
            return t && t.isLate;
        }).length;
        const totalEnrolled = newInqLeads.filter(l => l?.enrollmentStatus === 'ENROLLED').length;
        const enrollPercent = totalAssign > 0 ? ((totalEnrolled / totalAssign) * 100).toFixed(1) : 0;

        let r1Assign = 0, r1Covered = 0, r1Pending = 0;
        let r2Assign = 0, r2Covered = 0, r2Pending = 0;
        let r3Assign = 0, r3Covered = 0, r3Pending = 0;

        newInqLeads.forEach(l => {
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
    }, [newInqLeads]);

    const handleRemarkChangeLocal = (leadId, value) => {
        let finalValue = value;
        if (typingMode === 'si-phonetic') {
            const words = value.split(' ');
            const lastWord = words.pop();
            if (!/\d/.test(lastWord) && lastWord.length > 0) finalValue = [...words, singlishToSinhala(lastWord)].join(' ');
        }
        setDrafts(prev => ({ ...prev, [leadId]: finalValue }));
        localStorage.setItem(`draft_remark_as_${leadId}`, finalValue);
    };

    const handlePushToNextRound = async (leadId, currentRound, callStatus) => {
        if (callStatus === 'pending' || !callStatus) {
            return toast.error("Please change the Call Status before pushing to next round!");
        }
        if (callStatus === 'no_answer') {
            return toast.error("Cannot push to next round. Student must be Answered or Rejected.");
        }

        const confirmPush = window.confirm(`Move this lead to Round ${currentRound + 1}?`);
        if (!confirmPush) return;
        
        const loadToast = toast.loading("Moving lead to next round...");
        try {
            const token = localStorage.getItem('token');
            await axios.post('/after-seminar-crm/leads/bulk-action', { 
                action: 'CHANGE_ROUND', leadIds: [leadId], targetRound: currentRound + 1 
            }, { headers: { Authorization: `Bearer ${token}` }});
            
            toast.success("Lead moved to next round successfully!", { id: loadToast });
            setTimeout(() => window.location.reload(), 800);
        } catch(e) {
            toast.error("Failed to move round.", { id: loadToast });
        }
    };

    const addCustomRound = async () => {
        const name = window.prompt("Enter new custom campaign name:");
        if (name && name.trim()) {
            const nextRoundNum = Math.max(3, ...customRounds.map(r => r.roundNum), 3) + 1; 
            const moveLeads = window.confirm(`Do you want to move all currently NON-ENROLLED leads to this new '${name}' campaign?`);
            
            if (moveLeads) {
                const loadToast = toast.loading("Assigning non-enrolled leads...");
                try {
                    const token = localStorage.getItem('token');
                    await axios.post('/after-seminar-crm/leads/bulk-action', { action: 'CHANGE_ROUND', leadIds: newInqLeads.filter(l=>l.enrollmentStatus!=='ENROLLED').map(l=>l.id), targetRound: nextRoundNum }, { headers: { Authorization: `Bearer ${token}` }});
                    toast.success("Leads moved successfully!", { id: loadToast });
                    setTimeout(() => window.location.reload(), 800);
                } catch(e) { toast.error("Failed to move leads.", { id: loadToast }); }
            }
            updateCustomRounds([...customRounds, { roundNum: nextRoundNum, name: name.trim() }]);
        }
    };

    const removeCustomRound = async (roundNum, e) => {
        e.stopPropagation();
        if (window.confirm("Delete this custom campaign? All leads inside this will be moved back to the 1st Round.")) {
            const loadToast = toast.loading("Reverting leads back to 1st Round...");
            try {
                const token = localStorage.getItem('token');
                await axios.post('/after-seminar-crm/leads/revert-round', { roundToDelete: roundNum, targetRound: 1, inquiryType: 'NEW_INQ' }, { headers: { Authorization: `Bearer ${token}` }});
                updateCustomRounds(customRounds.filter(r => r.roundNum !== roundNum));
                if (activeCoordinationRound === roundNum) setActiveCoordinationRound(1);
                toast.success("Campaign deleted & leads reverted!", { id: loadToast });
                setTimeout(() => window.location.reload(), 800);
            } catch(err) { toast.error("Failed to revert leads.", { id: loadToast }); }
        }
    };

    const availableLeadsToAdd = newInqLeads.filter(l => {
        const notInCurrentRound = (l?.coordinationRound || 1) !== activeCoordinationRound;
        const matchesSearchTxt = l?.phone?.includes(addSearch) || (l?.name && l?.name?.toLowerCase().includes(addSearch.toLowerCase()));
        let matchesStatus = true;
        if (addFilterStatus === 'ENROLLED') matchesStatus = l?.enrollmentStatus === 'ENROLLED';
        if (addFilterStatus === 'NON_ENROLLED') matchesStatus = l?.enrollmentStatus !== 'ENROLLED';
        return notInCurrentRound && matchesSearchTxt && matchesStatus;
    });

    const toggleAddSelect = (id) => {
        if(selectedToAdd.includes(id)) setSelectedToAdd(selectedToAdd.filter(x => x !== id));
        else setSelectedToAdd([...selectedToAdd, id]);
    };

    const handleAddNumbersSubmit = async () => {
        if(selectedToAdd.length === 0) return toast.error("Select at least one lead");
        const loadToast = toast.loading("Adding numbers to campaign...");
        try {
            const token = localStorage.getItem('token');
            await axios.post('/after-seminar-crm/leads/bulk-action', { action: 'CHANGE_ROUND', leadIds: selectedToAdd, targetRound: activeCoordinationRound }, { headers: { Authorization: `Bearer ${token}` }});
            
            selectedToAdd.forEach(id => {
                handleUpdateLocalLead(id, 'coordinationRound', activeCoordinationRound);
                handleUpdateLocalLead(id, 'phase', 1);
                handleUpdateLocalLead(id, 'callStatus', 'pending');
            });
            toast.success("Numbers added successfully!", { id: loadToast });
            setShowAddNumbersModal(false);
            setSelectedToAdd([]);
        } catch(e) {
            toast.error("Locally Added! (Backend bulk update may be needed)", { id: loadToast });
            setShowAddNumbersModal(false);
            setSelectedToAdd([]);
        }
    };

    return (
        <div className="flex flex-col h-full w-full text-slate-200">
            <CampaignHeader 
                stats={overallStats} 
                activeCoordinationRound={activeCoordinationRound}
                setActiveCoordinationRound={(r) => { setActiveCoordinationRound(r); setDisplayLimit(36); }}
                customRounds={customRounds}
                removeCustomRound={removeCustomRound}
                addCustomRound={addCustomRound}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                searchQuery={searchQuery} 
                setSearchQuery={setSearchQuery} 
                typingMode={typingMode} 
                setTypingMode={setTypingMode}
                exportToExcel={exportToExcel}
                showOnlyDelayed={showOnlyDelayed}
                setShowOnlyDelayed={setShowOnlyDelayed}
                currentRoundDelayedCount={overallStats.totalLate}
                setIsStatsOpen={setIsStatsOpen}
                activePhaseFilter={activePhaseFilter}
                setActivePhaseFilter={setActivePhaseFilter}
                setShowAddNumbersModal={setShowAddNumbersModal}
            />

            <div className="flex-1 overflow-hidden flex flex-col mt-4">
                {groupedLeads.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-10 text-slate-500 bg-[#111827] rounded-[2rem] border border-slate-800">
                        <FaFilter size={40} className="mb-4 opacity-20" />
                        <h3 className="text-xl font-bold mb-1 text-slate-400">No Leads Found</h3>
                        <p className="text-sm">List is empty for the selected filters.</p>
                    </div>
                ) : (
                    <div className="overflow-y-auto custom-scrollbar pr-2 pb-10 space-y-8 flex-1">
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
                                                timer={calculateTimeRemaining(lead, activeCoordinationRound)} 
                                                drafts={drafts} 
                                                activeTab={activeCoordinationRound === 'ENROLLED' ? 'ENROLLED' : `ROUND_${activeCoordinationRound}`} 
                                                isManager={isManager} 
                                                typingMode={typingMode} 
                                                handleUpdateLocalLead={(id, f, v) => handleUpdateLocalLead(id, f, v)} 
                                                handleLocalCallStatusChange={(l, ns) => handleUpdateLocalLead(l.id, 'callStatus', ns)} 
                                                handleRemarkTyping={handleRemarkChangeLocal} 
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

            {/* ADD NUMBERS MODAL */}
            {showAddNumbersModal && (
                <div className="absolute inset-0 z-50 bg-[#0f151c]/95 backdrop-blur-sm flex justify-center items-center p-4 animate-fade-in">
                    <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center mb-5 border-b border-slate-800 pb-4">
                            <div>
                                <h3 className="text-lg font-bold text-white flex items-center gap-2"><FaPlus className="text-emerald-500"/> Add Numbers to Round {activeCoordinationRound > 3 ? customRounds.find(r => r.roundNum === activeCoordinationRound)?.name : activeCoordinationRound}</h3>
                            </div>
                            <button onClick={() => setShowAddNumbersModal(false)} className="text-slate-500 hover:text-white bg-slate-800 hover:bg-red-500/20 hover:text-red-400 p-2 rounded-lg transition-colors"><FaTimes/></button>
                        </div>

                        <div className="flex gap-3 mb-4 shrink-0">
                            <div className="relative flex-1">
                                <FaSearch className="absolute left-3 top-2.5 text-slate-500 text-sm" />
                                <input type="text" placeholder="Search unassigned numbers..." value={addSearch} onChange={(e) => setAddSearch(e.target.value)} className="w-full bg-[#0b0e14] border border-slate-800 rounded-lg py-2 pl-9 pr-4 text-xs text-white outline-none focus:border-indigo-500" />
                            </div>
                            <select value={addFilterStatus} onChange={(e) => setAddFilterStatus(e.target.value)} className="bg-[#0b0e14] border border-slate-800 rounded-lg px-3 text-xs font-semibold text-slate-300 outline-none cursor-pointer focus:border-indigo-500 appearance-none">
                                <option value="ALL">All Leads</option>
                                <option value="ENROLLED">Enrolled Only</option>
                                <option value="NON_ENROLLED">Non-Enrolled Only</option>
                            </select>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar border border-slate-800 rounded-xl p-2 bg-[#0b0e14]">
                            {availableLeadsToAdd.length === 0 ? (
                                <div className="text-center py-10 text-slate-500 text-xs font-bold uppercase tracking-widest">No leads found matching your search.</div>
                            ) : (
                                availableLeadsToAdd.map(lead => (
                                    <div key={lead.id} onClick={() => toggleAddSelect(lead.id)} className={`flex items-center justify-between p-3 rounded-lg mb-1.5 cursor-pointer transition-colors border ${selectedToAdd.includes(lead.id) ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-[#111827] border-slate-800 hover:border-slate-700'}`}>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className={`text-sm font-bold tracking-wide ${selectedToAdd.includes(lead.id) ? 'text-emerald-400' : 'text-slate-200'}`}>{lead.phone}</h4>
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${lead.enrollmentStatus === 'ENROLLED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                                    {lead.enrollmentStatus === 'ENROLLED' ? 'ENROLLED' : 'NON-ENROLLED'}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-slate-500 mt-0.5">{lead.name || 'Unknown'}</p>
                                        </div>
                                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${selectedToAdd.includes(lead.id) ? 'bg-emerald-500 border-emerald-500' : 'border-slate-700'}`}>
                                            {selectedToAdd.includes(lead.id) && <FaCheckCircle className="text-white" size={12}/>}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="mt-5 shrink-0 flex justify-between items-center gap-4 border-t border-slate-800 pt-4">
                            <span className="text-xs font-bold text-slate-400 bg-slate-800 px-3 py-1.5 rounded-lg">{selectedToAdd.length} leads selected</span>
                            <button disabled={selectedToAdd.length === 0} onClick={handleAddNumbersSubmit} className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md">
                                Add Selected Leads
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* 🔥 HIGH TECH STATS DRAWER (Fixed Chart & Layout) 🔥 */}
            {isStatsOpen && (
                <div className="fixed inset-0 z-[100] flex justify-end bg-black/60 backdrop-blur-sm transition-all">
                    <div className="w-full max-w-[400px] bg-[#0f172a] h-full shadow-2xl flex flex-col border-l border-slate-700 animate-fade-in-right">
                        <div className="p-5 bg-white/5 border-b border-white/10 flex justify-between items-center shrink-0">
                            <h2 className="text-base font-black uppercase text-white flex items-center gap-2"><FaChartPie className="text-indigo-400"/> New Inquiries Stats</h2>
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