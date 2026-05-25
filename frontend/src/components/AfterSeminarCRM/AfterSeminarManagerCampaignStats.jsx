import React, { useState, useEffect, useMemo } from 'react';
import axios from '../../api/axios';
import { FaUsers, FaUserCheck, FaUserClock, FaBookOpen, FaChartBar, FaListAlt, FaSearch, FaTimes, FaFilter, FaMoneyBillWave, FaCheckCircle, FaExchangeAlt } from 'react-icons/fa';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import toast from 'react-hot-toast';

import SubjectEnrollmentStats from "./CampaignStatsModules/SubjectEnrollmentStats"; 
import OpenSeminarControls from "./CampaignStatsModules/OpenSeminarControls";
import NewInquiriesPerformance from "./CampaignStatsModules/NewInquiriesPerformance";
import PaidCampaignPerformance from "./CampaignStatsModules/PaidCampaignPerformance";
import BridgeTransfersTab from "./CampaignStatsModules/BridgeTransfersTab";
import B2BLeadTransferHub from './B2BLeadTransferHub';

export default function AfterSeminarManagerCampaignStats({ filters = {}, allBatches, campaignType }) {
    // 🔥 උඩ තියෙන filters = {} කෑල්ල තමයි Error එක නැති කරන්නේ 🔥

    const loggedUser = JSON.parse(localStorage.getItem('user') || '{}');
    const userRole = (loggedUser.role || '').toUpperCase().replace(/ /g, '_');
    
    // Admin හෝ Manager ද කියලා බලනවා
    const isHigherManagement = ['SYSTEM_ADMIN', 'DIRECTOR', 'MANAGER', 'SUPER'].includes(userRole);

    const [loading, setLoading] = useState(true);
    
    const [stats, setStats] = useState({
        totalLeads: 0, assignedLeads: 0, unassignedLeads: 0,
        openSemLeads: 0, newInqLeads: 0, staffAllocation: [], 
        subjectEnrollments: [], mixerData: [],
        verifiedStudentsNotInCrm: []
    });

    const [showMasterModal, setShowMasterModal] = useState(false);
    const [masterLoading, setMasterLoading] = useState(false);
    const [masterLeads, setMasterLeads] = useState([]);
    const [masterSearch, setMasterSearch] = useState('');
    const [masterBatchFilter, setMasterBatchFilter] = useState('ALL');
    
    // Direct Signups (Not in CRM but verified payment) State
    const [directSignups, setDirectSignups] = useState([]);
    const [activeDirectoryTab, setActiveDirectoryTab] = useState('LEADS'); // 'LEADS' or 'DIRECT'

    const [leadsLimit, setLeadsLimit] = useState(50);
    const [directLimit, setDirectLimit] = useState(50);

    // Reset pagination limits back to 50 when search, batch filter or active tab changes
    useEffect(() => {
        setLeadsLimit(50);
        setDirectLimit(50);
    }, [masterSearch, masterBatchFilter, activeDirectoryTab]);

    // B2B Transfer States
    const [showTransferHub, setShowTransferHub] = useState(false);
    const [unreadTransfersCount, setUnreadTransfersCount] = useState(0);

    // Extract unique businesses for the transfer modal from allBatches
    const uniqueBusinesses = useMemo(() => {
        const bizMap = new Map();
        (allBatches || []).forEach(b => {
            if (b.business && !bizMap.has(b.business.id)) {
                bizMap.set(b.business.id, b.business);
            }
        });
        return Array.from(bizMap.values());
    }, [allBatches]);

    // Business එක මාරු වෙද්දි ඇත්තම Inbox එකේ ගාණ අරන් Button එක Blink කරනවා
    useEffect(() => {
        if (filters.selectedBusiness && isHigherManagement && campaignType === 'OVERALL') {
            const token = localStorage.getItem('token');
            axios.get('/after-seminar-crm/leads/b2b-history', { 
                headers: { Authorization: `Bearer ${token}` },
                params: { businessId: filters.selectedBusiness } 
            })
            .then(res => {
                const newInboxItems = res.data.inbox || [];
                setUnreadTransfersCount(newInboxItems.length);
            })
            .catch(() => {});
        }
    }, [filters.selectedBusiness, isHigherManagement, campaignType]);

    useEffect(() => {
        if ((filters.selectedBusiness || filters.selectedBatch) && isHigherManagement && campaignType === 'OVERALL') {
            fetchDashboardStats();
        } else {
            setLoading(false);
        }
    }, [filters.selectedBusiness, filters.selectedBatch, isHigherManagement, campaignType]);

    const fetchDashboardStats = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/after-seminar-crm/manager-dashboard-stats', {
                headers: { Authorization: `Bearer ${token}` },
                params: { businessId: filters.selectedBusiness, batchId: filters.selectedBatch || 'ALL' }
            });
            if (res.data) {
                setStats({
                    ...res.data,
                    staffAllocation: res.data.staffAllocation || [],
                    subjectEnrollments: res.data.subjectEnrollments || [],
                    mixerData: res.data.mixerData || [],
                    verifiedStudentsNotInCrm: res.data.verifiedStudentsNotInCrm || []
                });
            }
        } catch (error) { 
            console.error("Failed to load manager stats", error); 
        } finally {
            setLoading(false);
        }
    };

    const fetchMasterDirectory = async () => {
        setMasterLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/after-seminar-crm/leads/master-directory', {
                headers: { Authorization: `Bearer ${token}` },
                params: { businessId: filters.selectedBusiness }
            });
            setMasterLeads(res.data.leads || []);
            setDirectSignups(res.data.verifiedStudentsNotInCrm || []);
        } catch (err) {
            toast.error("Failed to load Master Directory.");
            setMasterLeads([]); 
            setDirectSignups([]); 
        } finally {
            setMasterLoading(false);
        }
    };

    useEffect(() => {
        if (showMasterModal && isHigherManagement) {
            fetchMasterDirectory();
        }
    }, [showMasterModal]);

    const filteredMaster = useMemo(() => {
        const safeFiltered = (masterLeads || []).filter(l => {
            const matchSearch = l.phone.includes(masterSearch) || (l.name || '').toLowerCase().includes(masterSearch.toLowerCase());
            const matchBatch = masterBatchFilter === 'ALL' || String(l.batchId) === String(masterBatchFilter);
            return matchSearch && matchBatch;
        });

        // Deduplicate safeFiltered by student phone suffix (last 9 digits)
        const uniqueLeads = [];
        const seenPhones = new Set();
        
        safeFiltered.forEach(l => {
            if (!l.phone) return;
            const cleanPhone = l.phone.split('_')[0].replace(/[^0-9]/g, '');
            if (cleanPhone.length >= 9) {
                const key = cleanPhone.slice(-9);
                if (!seenPhones.has(key)) {
                    seenPhones.add(key);
                    uniqueLeads.push(l);
                }
            } else {
                uniqueLeads.push(l);
            }
        });
        
        return uniqueLeads;
    }, [masterLeads, masterSearch, masterBatchFilter]);

    const filteredDirectSignups = useMemo(() => {
        return (directSignups || []).filter(s => {
            const matchSearch = (s.phone || '').includes(masterSearch) || (s.name || '').toLowerCase().includes(masterSearch.toLowerCase());
            const matchBatch = masterBatchFilter === 'ALL' || String(s.batchId) === String(masterBatchFilter);
            return matchSearch && matchBatch;
        });
    }, [directSignups, masterSearch, masterBatchFilter]);

    const displayedLeads = useMemo(() => {
        return (filteredMaster || []).slice(0, leadsLimit);
    }, [filteredMaster, leadsLimit]);

    const displayedDirect = useMemo(() => {
        return (filteredDirectSignups || []).slice(0, directLimit);
    }, [filteredDirectSignups, directLimit]);

    const mStats = useMemo(() => {
        const safeFiltered = filteredMaster || [];
        const safeDirect = filteredDirectSignups || [];
        
        const enrolledLeadsCount = safeFiltered.filter(l => l.enrollmentStatus === 'ENROLLED').length;
        const totalEnrolled = enrolledLeadsCount + safeDirect.length;

        const fullIntention = safeFiltered.filter(l => l.paymentIntention === 'FULL').length + safeDirect.filter(s => s.paymentIntention === 'FULL').length;
        const monthlyIntention = safeFiltered.filter(l => l.paymentIntention === 'MONTHLY').length + safeDirect.filter(s => s.paymentIntention === 'MONTHLY').length;
        const installmentIntention = safeFiltered.filter(l => l.paymentIntention === 'INSTALLMENT').length + safeDirect.filter(s => s.paymentIntention === 'INSTALLMENT').length;
        const notDecidedIntention = safeFiltered.filter(l => !l.paymentIntention || l.paymentIntention === 'NOT_DECIDED').length;

        return {
            total: safeFiltered.length + safeDirect.length,
            enrolled: totalEnrolled,
            nonEnrolled: safeFiltered.filter(l => l.enrollmentStatus !== 'ENROLLED').length,
            directSignupsCount: safeDirect.length,
            full: fullIntention,
            monthly: monthlyIntention,
            installment: installmentIntention,
            notDecided: notDecidedIntention,
        };
    }, [filteredMaster, filteredDirectSignups]);

    if (campaignType === 'OVERALL' && !isHigherManagement) {
        return <div className="p-10 text-center text-slate-500 font-bold">Access Denied. You do not have permission to view the Master Dashboard.</div>;
    }

    if (loading && campaignType === 'OVERALL') return <div className="flex justify-center items-center h-[200px] text-indigo-400 font-sans tracking-wide animate-pulse font-bold">Loading Master Workspace...</div>;

    const LEAD_COLORS = ['#ec4899', '#3b82f6'];
    const leadTypeData = [ 
        { name: 'Open Seminar', value: stats.openSemLeads || 0 }, 
        { name: 'New Inquiries', value: stats.newInqLeads || 0 } 
    ];

    return (
        <div className="w-full flex flex-col gap-6 font-sans antialiased text-slate-200 bg-transparent">
            
            {/* 🔥 1. OVERALL TAB (Campaign Overview - Master Stats Only) 🔥 */}
            {campaignType === 'OVERALL' && isHigherManagement && (
                <div className="space-y-6 animate-fade-in-up">
                    
                    {/* MASTER DIRECTORY & B2B TRANSFER ACTIONS */}
                    <div className="flex justify-between items-center bg-[#1e293b] border border-slate-700 p-6 rounded-3xl flex-col sm:flex-row gap-4 shadow-lg">
                        <div>
                            <h3 className="text-indigo-400 font-black text-lg tracking-wide flex items-center gap-2"><FaListAlt/> Master Campaign Hub</h3>
                            <p className="text-slate-400 text-xs mt-1 font-medium">Manage directories and transfer leads between units.</p>
                        </div>
                        
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            {/* B2B Transfer Button */}
                            <button 
                                onClick={() => setShowTransferHub(true)} 
                                className={`px-5 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-transform hover:scale-105 uppercase tracking-widest border w-full sm:w-auto ${unreadTransfersCount > 0 ? 'bg-amber-600/20 text-amber-400 border-amber-500/50 animate-pulse' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}`}
                            >
                                <FaExchangeAlt /> 
                                B2B Transfers
                                {unreadTransfersCount > 0 && (
                                    <span className="bg-amber-500 text-white px-2 py-0.5 rounded-md text-[10px] ml-1">
                                        {unreadTransfersCount} NEW
                                    </span>
                                )}
                            </button>

                            {/* View Full Directory Button */}
                            <button 
                                onClick={() => setShowMasterModal(true)} 
                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-transform hover:scale-105 uppercase tracking-widest w-full sm:w-auto"
                            >
                                View Full Directory
                            </button>
                        </div>
                    </div>

                    {/* STATS CARDS */}
                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                        <div className="bg-[#1e293b] p-6 rounded-3xl border border-slate-700/50 shadow-xl flex items-center gap-5 hover:bg-slate-800 transition-all">
                            <div className="p-4 bg-blue-500/10 text-blue-400 rounded-2xl"><FaUsers size={24}/></div>
                            <div><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Leads</p><h2 className="text-3xl font-black text-white mt-1">{stats.totalLeads || 0}</h2></div>
                        </div>
                        <div className="bg-[#1e293b] p-6 rounded-3xl border border-slate-700/50 shadow-xl flex items-center gap-5 hover:bg-slate-800 transition-all relative overflow-hidden">
                            <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl"></div>
                            <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-2xl relative z-10"><FaUserCheck size={24}/></div>
                            <div className="relative z-10"><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Assigned</p><h2 className="text-3xl font-black text-emerald-400 mt-1">{stats.assignedLeads || 0}</h2></div>
                        </div>
                        <div className="bg-[#1e293b] p-6 rounded-3xl border border-slate-700/50 shadow-xl flex items-center gap-5 hover:bg-slate-800 transition-all">
                            <div className="p-4 bg-red-500/10 text-red-400 rounded-2xl"><FaUserClock size={24}/></div>
                            <div><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Unassigned</p><h2 className="text-3xl font-black text-red-400 mt-1">{stats.unassignedLeads || 0}</h2></div>
                        </div>
                        <div className="bg-[#1e293b] p-6 rounded-3xl border border-slate-700/50 shadow-xl flex flex-col justify-center hover:bg-slate-800 transition-all">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3">Assigned Breakdown</p>
                            <div className="flex justify-between items-center text-xs font-black mb-2">
                                <span className="text-blue-400">Open Sem: {stats.openSemLeads || 0}</span>
                                <span className="text-pink-400">New Inq: {stats.newInqLeads || 0}</span>
                            </div>
                            <div className="w-full h-2 bg-[#0f172a] rounded-full flex overflow-hidden shadow-inner">
                                <div style={{width: `${((stats.openSemLeads || 0) / (stats.assignedLeads || 1)) * 100}%`}} className="bg-blue-500 h-full"></div>
                                <div style={{width: `${((stats.newInqLeads || 0) / (stats.assignedLeads || 1)) * 100}%`}} className="bg-pink-500 h-full"></div>
                            </div>
                        </div>
                    </div>

                    {/* CHARTS ROW */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="bg-[#1e293b] p-6 rounded-3xl border border-slate-700/50 shadow-xl lg:col-span-2">
                            <h3 className="text-xs font-bold text-slate-300 mb-6 uppercase tracking-widest flex items-center gap-2"><FaChartBar className="text-blue-400"/> Staff Workload</h3>
                            <div className="h-[280px]">
                                {(!stats.staffAllocation || stats.staffAllocation.length === 0) ? <div className="flex h-full items-center justify-center text-slate-500 text-sm font-medium">No data available.</div> : (
                                    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                                        <BarChart data={stats.staffAllocation} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                            <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                                            <RechartsTooltip cursor={{fill: '#ffffff05'}} contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize:'12px', color: '#fff'}} />
                                            <Bar dataKey="assigned" name="Allocated Leads" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={35} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>

                        <div className="bg-[#1e293b] p-6 rounded-3xl border border-slate-700/50 shadow-xl">
                            <h3 className="text-xs font-bold text-slate-300 mb-2 uppercase tracking-widest flex items-center gap-2"><FaBookOpen className="text-pink-400"/> Lead Sources</h3>
                            <div className="h-[280px]">
                                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                                    <PieChart>
                                        <Pie data={leadTypeData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none">
                                            {leadTypeData.map((entry, index) => <Cell key={`cell-${index}`} fill={LEAD_COLORS[index % LEAD_COLORS.length]} />)}
                                        </Pie>
                                        <RechartsTooltip contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize:'12px', color: '#fff'}} />
                                        <Legend verticalAlign="bottom" wrapperStyle={{fontSize: '11px', paddingTop: '20px', color: '#94a3b8', fontWeight: 'bold'}} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <SubjectEnrollmentStats rawSubjects={stats.subjectEnrollments || []} mixerData={stats.mixerData || []} />

                    {/* 🔥 NEW DETAILED SECTION: DIRECT SIGNUPS LIST ON MAIN DASHBOARD 🔥 */}
                    {stats.verifiedStudentsNotInCrm && stats.verifiedStudentsNotInCrm.length > 0 && (
                        <div className="bg-white/[0.02] backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-xl space-y-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                        <FaUsers size={16} /> Verified Direct Signups (Not in CRM)
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-1 font-medium">
                                        Students with approved payments who registered directly and do not exist as CRM leads.
                                    </p>
                                </div>
                                <span className="bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 px-4 py-2 rounded-xl text-xs font-black shadow-inner">
                                    {stats.verifiedStudentsNotInCrm.length} Students
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                {stats.verifiedStudentsNotInCrm.map((s, i) => (
                                    <div key={i} className="bg-white/[0.03] p-4 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all flex justify-between items-center gap-3">
                                        <div>
                                            <h4 className="text-white font-bold text-sm tracking-wide">{s.phone}</h4>
                                            <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase tracking-widest">{s.name || 'Unknown'}</p>
                                            <p className="text-[9px] text-slate-500 mt-1 uppercase font-semibold tracking-wider">Batch: {s.batchName || 'N/A'}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-lg text-[10px] font-black shadow-sm">
                                                LKR {s.amountPaid?.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* 🔥 2. RENDER SPECIFIC CAMPAIGN STATS 🔥 */}
            {campaignType === 'OPEN_SEM' && <div className="animate-fade-in-up"><OpenSeminarControls filters={filters} allBatches={allBatches} isManager={true} /></div>}
            {campaignType === 'NEW_INQ' && <div className="animate-fade-in-up"><NewInquiriesPerformance filters={filters} allBatches={allBatches} isManager={true} /></div>}
            {campaignType === 'BRIDGE' && <div className="animate-fade-in-up"><BridgeTransfersTab filters={filters} /></div>}
            {campaignType === 'PAID' && <div className="animate-fade-in-up"><PaidCampaignPerformance filters={filters} /></div>}

            {/* 🔥 FULL SCREEN MODAL: MASTER LEAD DIRECTORY (ONLY FOR OVERALL) 🔥 */}
            {showMasterModal && isHigherManagement && (
                <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4 pl-[260px] lg:pl-[280px] xl:pl-[300px] w-full h-full animate-fade-in">
                    <div className="bg-slate-900/90 backdrop-blur-2xl w-full h-full rounded-3xl flex flex-col overflow-hidden border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.6)] relative">
                        <div className="bg-white/5 backdrop-blur-md px-6 py-5 flex justify-between items-center border-b border-white/10 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl"><FaListAlt size={22}/></div>
                                <div>
                                    <h3 className="text-white font-black text-xl tracking-wide">Campaign Master Directory</h3>
                                    <p className="text-slate-400 text-xs mt-1 font-medium">Comprehensive view of all inquiries, direct signups, and enrollment statistics</p>
                                </div>
                            </div>
                            <button onClick={() => setShowMasterModal(false)} className="bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white p-3 rounded-xl transition-all shadow-sm">
                                <FaTimes size={18} />
                            </button>
                        </div>

                        {masterLoading ? (
                            <div className="flex-1 flex justify-center items-center text-indigo-400 animate-pulse font-bold text-xl">Fetching Global Directory...</div>
                        ) : (
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-transparent">
                                
                                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
                                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 xl:col-span-3">
                                        <div className="bg-white/[0.03] p-5 rounded-3xl border border-white/10 flex flex-col justify-center shadow-lg hover:border-indigo-500/30 transition-all">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Students</p>
                                            <h2 className="text-3xl font-black text-white mt-1">{mStats.total || 0}</h2>
                                        </div>
                                        <div className="bg-emerald-500/10 p-5 rounded-3xl border border-emerald-500/20 flex flex-col justify-center shadow-lg hover:bg-emerald-500/15 transition-all">
                                            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest font-black">Total Enrolled</p>
                                            <h2 className="text-3xl font-black text-emerald-400 mt-1">{mStats.enrolled || 0}</h2>
                                        </div>
                                        <div className="bg-indigo-500/10 p-5 rounded-3xl border border-indigo-500/20 flex flex-col justify-center shadow-lg hover:bg-indigo-500/15 transition-all">
                                            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest font-black">Direct Signups</p>
                                            <h2 className="text-3xl font-black text-indigo-400 mt-1">{mStats.directSignupsCount || 0}</h2>
                                        </div>
                                        <div className="bg-rose-500/10 p-5 rounded-3xl border border-rose-500/20 flex flex-col justify-center shadow-lg hover:bg-rose-500/15 transition-all">
                                            <p className="text-[10px] text-rose-400 font-bold uppercase tracking-widest">Non-Enrolled</p>
                                            <h2 className="text-3xl font-black text-rose-400 mt-1">{mStats.nonEnrolled || 0}</h2>
                                        </div>
                                        <div className="bg-amber-500/10 p-5 rounded-3xl border border-amber-500/20 flex flex-col justify-center shadow-lg hover:bg-amber-500/15 transition-all col-span-2 md:col-span-1">
                                            <p className="text-[10px] text-amber-400 font-bold uppercase tracking-widest">Conversion</p>
                                            <h2 className="text-3xl font-black text-amber-400 mt-1">
                                                {mStats.total > 0 ? Math.round((mStats.enrolled / mStats.total) * 100) : 0}%
                                            </h2>
                                        </div>
                                    </div>
                                </div>

                                {/* Tab Capsule Toggle */}
                                <div className="flex gap-2 p-1.5 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 w-max mb-6">
                                    <button 
                                        onClick={() => setActiveDirectoryTab('LEADS')}
                                        className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 ${activeDirectoryTab === 'LEADS' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-slate-200'}`}
                                    >
                                        Campaign Leads ({filteredMaster.length})
                                    </button>
                                    <button 
                                        onClick={() => setActiveDirectoryTab('DIRECT')}
                                        className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 ${activeDirectoryTab === 'DIRECT' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-slate-200'}`}
                                    >
                                        Direct Signups ({filteredDirectSignups.length})
                                    </button>
                                </div>

                                {/* Filters for Modal */}
                                <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/[0.02] backdrop-blur-md p-5 rounded-3xl border border-white/10 mb-6 shadow-md">
                                    <div className="flex items-center gap-3 w-full md:w-auto">
                                        <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-400"><FaFilter size={16} /></div>
                                        <select 
                                            value={masterBatchFilter} 
                                            onChange={(e) => setMasterBatchFilter(e.target.value)} 
                                            className="bg-slate-900 border border-white/10 text-white text-xs font-bold rounded-xl px-5 py-3 outline-none focus:border-indigo-500 cursor-pointer shadow-inner"
                                        >
                                            <option value="ALL">All Batches</option>
                                            {(allBatches || []).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="relative w-full md:w-96">
                                        <FaSearch className="absolute left-4 top-3.5 text-slate-400 text-sm" />
                                        <input 
                                            type="text" 
                                            placeholder="Search by Name or Phone..." 
                                            value={masterSearch} 
                                            onChange={(e) => setMasterSearch(e.target.value)} 
                                            className="w-full bg-slate-900 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-xs font-bold text-white outline-none focus:border-indigo-500 transition-all shadow-inner placeholder-slate-500" 
                                        />
                                    </div>
                                </div>

                                {/* Data Table */}
                                <div className="bg-white/[0.02] backdrop-blur-md rounded-3xl border border-white/10 overflow-hidden shadow-xl">
                                    <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
                                        {activeDirectoryTab === 'LEADS' ? (
                                            <>
                                                <table className="w-full text-left text-sm whitespace-nowrap">
                                                    <thead className="bg-white/[0.04] text-slate-300 text-[10px] uppercase tracking-widest sticky top-0 z-10 shadow-md border-b border-white/10">
                                                        <tr>
                                                            <th className="py-5 px-6 font-black">Student Details</th>
                                                            <th className="py-5 px-6 font-black text-center">Inquiry Source</th>
                                                            <th className="py-5 px-6 font-black text-center text-blue-400">Marked Intention</th>
                                                            <th className="py-5 px-6 font-black text-center text-emerald-400">Actual Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-white/5">
                                                        {(!displayedLeads || displayedLeads.length === 0) ? (
                                                            <tr><td colSpan="4" className="text-center py-16 text-slate-500 font-bold text-base">No leads match your search criteria.</td></tr>
                                                        ) : (
                                                            displayedLeads.map((l, i) => (
                                                                <tr key={i} className="hover:bg-white/[0.03] transition-colors">
                                                                    <td className="py-4 px-6">
                                                                        <h4 className="text-slate-100 font-black text-base tracking-wide">{l.phone}</h4>
                                                                        <p className="text-[11px] font-bold text-slate-500 mt-1 uppercase tracking-widest">{l.name || 'Unknown'}</p>
                                                                    </td>
                                                                    <td className="py-4 px-6 text-center">
                                                                        <span className="bg-slate-800 text-slate-300 px-4 py-2 rounded-lg text-[10px] font-black tracking-widest uppercase border border-slate-700 shadow-sm">
                                                                            {l.inquiryType?.replace('_', ' ') || 'UNKNOWN'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-4 px-6 text-center">
                                                                        <span className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border shadow-sm ${l.paymentIntention === 'FULL' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : l.paymentIntention === 'MONTHLY' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : l.paymentIntention === 'INSTALLMENT' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-slate-900 text-slate-400 border-white/5'}`}>
                                                                            {l.paymentIntention || 'NOT DECIDED'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-4 px-6 text-center">
                                                                        {l.enrollmentStatus === 'ENROLLED' ? (
                                                                            <span className="text-emerald-400 font-black text-xs flex items-center justify-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-lg w-max mx-auto shadow-sm"><FaCheckCircle/> ENROLLED</span>
                                                                        ) : (
                                                                            <span className="text-rose-400 font-black text-[10px] uppercase tracking-widest bg-rose-500/10 border border-rose-500/20 px-4 py-2 rounded-lg w-max mx-auto shadow-sm">Non-Enrolled</span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        )}
                                                    </tbody>
                                                </table>
                                                {filteredMaster.length > leadsLimit && (
                                                    <div className="p-4 flex justify-center border-t border-white/5 bg-slate-950/80 sticky bottom-0 z-20 backdrop-blur-md">
                                                        <button 
                                                            onClick={() => setLeadsLimit(prev => prev + 50)}
                                                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider py-2.5 px-6 rounded-xl transition-all shadow-md hover:scale-[1.02]"
                                                        >
                                                            Load More (Showing {leadsLimit} of {filteredMaster.length})
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <table className="w-full text-left text-sm whitespace-nowrap">
                                                    <thead className="bg-white/[0.04] text-slate-300 text-[10px] uppercase tracking-widest sticky top-0 z-10 shadow-md border-b border-white/10">
                                                        <tr>
                                                            <th className="py-5 px-6 font-black">Student Details</th>
                                                            <th className="py-5 px-6 font-black text-center">Registered Batch</th>
                                                            <th className="py-5 px-6 font-black text-center text-blue-400">Payment Intention</th>
                                                            <th className="py-5 px-6 font-black text-center text-emerald-400">Paid Amount</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-white/5">
                                                        {(!displayedDirect || displayedDirect.length === 0) ? (
                                                            <tr><td colSpan="4" className="text-center py-16 text-slate-500 font-bold text-base">No direct signups match your search criteria.</td></tr>
                                                        ) : (
                                                            displayedDirect.map((s, i) => (
                                                                <tr key={i} className="hover:bg-white/[0.03] transition-colors">
                                                                    <td className="py-4 px-6">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                                                                                STU-{s.studentId}
                                                                            </span>
                                                                            <h4 className="text-slate-100 font-black text-base tracking-wide">{s.phone}</h4>
                                                                        </div>
                                                                        <p className="text-[11px] font-bold text-slate-500 mt-1 uppercase tracking-widest">{s.name || 'Unknown'}</p>
                                                                    </td>
                                                                    <td className="py-4 px-6 text-center">
                                                                        <span className="bg-slate-800 text-slate-300 px-4 py-2 rounded-lg text-[10px] font-black tracking-widest uppercase border border-slate-700 shadow-sm">
                                                                            {s.batchName || 'N/A'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-4 px-6 text-center">
                                                                        <span className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border shadow-sm ${s.paymentIntention === 'FULL' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : s.paymentIntention === 'MONTHLY' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : s.paymentIntention === 'INSTALLMENT' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-slate-900 text-slate-400 border-white/5'}`}>
                                                                            {s.paymentIntention || 'MONTHLY'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-4 px-6 text-center">
                                                                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-4 py-2 rounded-lg text-xs font-black shadow-sm inline-flex items-center gap-1.5">
                                                                            LKR {s.amountPaid?.toLocaleString()}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        )}
                                                    </tbody>
                                                </table>
                                                {filteredDirectSignups.length > directLimit && (
                                                    <div className="p-4 flex justify-center border-t border-white/5 bg-slate-950/80 sticky bottom-0 z-20 backdrop-blur-md">
                                                        <button 
                                                            onClick={() => setDirectLimit(prev => prev + 50)}
                                                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider py-2.5 px-6 rounded-xl transition-all shadow-md hover:scale-[1.02]"
                                                        >
                                                            Load More (Showing {directLimit} of {filteredDirectSignups.length})
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 🔥 B2B LEAD TRANSFER MODAL 🔥 */}
            <B2BLeadTransferHub 
                isOpen={showTransferHub} 
                onClose={() => setShowTransferHub(false)} 
                currentBusinessId={filters.selectedBusiness} // Error Fixed
            />

        </div>
    );
}