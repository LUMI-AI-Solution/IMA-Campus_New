import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from '../../../api/axios';
import { 
  FaUsers, FaBookOpen, FaFilter, FaMoneyBillWave, FaSpinner, FaCircle,
  FaCalendarCheck, FaClock, FaChalkboardTeacher, FaComments, FaCalendarAlt, FaReplyAll, FaChartLine,
  FaTruck, FaExclamationCircle, FaUserClock, FaChartPie, FaCheckCircle, FaInbox, FaBox,
  FaWhatsapp, FaExclamationTriangle, FaArrowRight, FaExternalLinkAlt,
  FaTable, FaChartBar, FaEye, FaEyeSlash
} from 'react-icons/fa';
import { 
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList 
} from 'recharts';

import DelegateSocialMediaTaskModal from '../../../components/common/DelegateSocialMediaTaskModal';
import WhatsAppMetaMonitor from '../../../components/WhatsAppMetaMonitor/WhatsAppMetaMonitor';
import CampaignSummaryTiles from './components/CampaignSummaryTiles';

// 🔥 Modern custom tooltip for Course Enrollments breakdown (Cyber Neon) 🔥
// 🔥 Shorten long subject names for modern executive readability (e.g. S.F.T, B.S.T) 🔥
const formatShortSubject = (rawName = '') => {
  if (!rawName) return '';
  const s = String(rawName).trim();
  const lower = s.toLowerCase();

  if (lower.includes('science for technology') || lower.includes('(sft)') || lower === 'sft') return 'S.F.T';
  if (lower.includes('bio-system') || lower.includes('bio system') || lower.includes('(bst)') || lower === 'bst') {
    if (lower.includes('practical')) return 'BST Pract.';
    return 'B.S.T';
  }
  if (lower.includes('engineering technology') || lower.includes('(et)') || lower === 'et') {
    if (lower.includes('practical')) return 'ET Pract.';
    return 'E.T';
  }
  if (lower.includes('information & communication') || lower.includes('(ict)') || lower === 'ict') return 'I.C.T';
  if (lower.includes('buddhist civilization') || lower.includes('buddhist civ') || lower.includes('b.c')) return 'B.C';
  if (lower.includes('agriculture') || lower.includes('agri')) return 'Agri';
  if (lower.includes('business stud') || lower.includes('business stu') || lower === 'bs') return 'B.S';
  if (lower.includes('political science')) return 'Political';
  if (lower.includes('general english')) return 'English';
  if (lower.includes('accounting')) return 'Accounting';
  if (lower.includes('economics')) return 'Economics';
  
  if (s.length > 13) return s.slice(0, 11) + '..';
  return s;
};

// 🔥 Modern custom tooltip for Course Enrollments breakdown (Cyber Neon) 🔥
const CustomEnrollmentTooltip = ({ active, payload, label, data }) => {
  if (active && payload && payload.length) {
    const full = payload.find(p => p.dataKey === 'full')?.value || 0;
    const monthly = payload.find(p => p.dataKey === 'monthly')?.value || 0;
    const installment = payload.find(p => p.dataKey === 'installment')?.value || 0;
    const total = full + monthly + installment;
    const matchedItem = (data || []).find(d => d.subject === label);
    const displayTitle = matchedItem?.fullSubject || label;
    return (
      <div className="bg-[#0b1220]/95 backdrop-blur-xl border border-cyan-500/30 p-3.5 rounded-2xl shadow-2xl text-xs min-w-[220px]">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 gap-3">
          <span className="font-black text-white text-sm truncate" title={displayTitle}>{displayTitle}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold shrink-0 font-mono">
            {total} Total
          </span>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]"></span>
              Full Payment
            </span>
            <span className="font-bold text-cyan-300 font-mono">
              {full} <span className="text-[10px] text-slate-400 font-sans">({total > 0 ? Math.round((full / total) * 100) : 0}%)</span>
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-fuchsia-400 shadow-[0_0_6px_#e879f9]"></span>
              Monthly
            </span>
            <span className="font-bold text-fuchsia-300 font-mono">
              {monthly} <span className="text-[10px] text-slate-400 font-sans">({total > 0 ? Math.round((monthly / total) * 100) : 0}%)</span>
            </span>
          </div>
          {installment > 0 && (
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_6px_#fbbf24]"></span>
                Installments
              </span>
              <span className="font-bold text-amber-300 font-mono">
                {installment} <span className="text-[10px] text-slate-400 font-sans">({total > 0 ? Math.round((installment / total) * 100) : 0}%)</span>
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

// 🔥 Custom X-Axis Tick that puts Subject Name + Total count at the BOTTOM (Yatin) 🔥
const CustomEnrollmentXAxisTick = ({ x, y, payload, data }) => {
  const item = (data || []).find(d => d.subject === payload?.value);
  const total = item ? item.total : null;
  return (
    <g transform={`translate(${x},${y})`}>
      <text 
        x={0} 
        y={0} 
        dy={14} 
        textAnchor="middle" 
        fill="#f1f5f9" 
        fontSize={11} 
        fontWeight={800}
        className="tracking-tight select-none font-sans"
      >
        {payload?.value}
      </text>
      {total !== null && (
        <text 
          x={0} 
          y={0} 
          dy={28} 
          textAnchor="middle" 
          fill="#94a3b8" 
          fontSize={10} 
          fontWeight={700}
          fontFamily="monospace"
          className="select-none"
        >
          {total} Total
        </text>
      )}
    </g>
  );
};

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [isDelegateModalOpen, setIsDelegateModalOpen] = useState(false);
  const [enrollmentViewMode, setEnrollmentViewMode] = useState('chart'); // 'chart' | 'table'
  const [showBarValues, setShowBarValues] = useState(true);

  const [businesses, setBusinesses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('ALL');

  const [realtimeChatSummary, setRealtimeChatSummary] = useState({
    afterSeminar: { totalUnread: 0, newUnread: 0, newTotal: 0, expiringSoon: 0, expired: 0, active: 0 },
    freeSeminar: { totalUnread: 0, newUnread: 0, newTotal: 0, expiringSoon: 0, expired: 0, active: 0 }
  });
  const [realtimeLoading, setRealtimeLoading] = useState(false);

  const [stats, setStats] = useState({
    activeStudentsCount: 0,
    totalRevenue: 0,
    activeBatchesCount: 0,
    crmMessages: { received: 0, replied: 0 },
    coordinatorStats: [],
    todayClasses: [],
    leadStats: { total: 0, assigned: 0, unassigned: 0, openSem: 0, newInq: 0, bridge: 0 },
    mixerData: [],
    deliveryStats: { pending: 0, dispatched: 0, delivered: 0, hold: 0 },
    pendingTasks: 0
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
    fetchBusinessesAndBatches();
  }, []);

  const fetchBusinessesAndBatches = async () => {
    try {
      const res = await axios.get('/admin/manager/batches-full');
      const allBatches = res.data;
      setBatches(allBatches);

      const uniqueBiz = [];
      const bizMap = new Map();
      allBatches.forEach(b => {
        if (b.business && !bizMap.has(b.business.id)) {
          bizMap.set(b.business.id, b.business);
          uniqueBiz.push(b.business);
        }
      });
      setBusinesses(uniqueBiz);
    } catch (err) {
      console.error("Error loading filters", err);
    }
  };

  const rawRole = user?.role || '';
  const userRole = rawRole.toUpperCase().replace(/ /g, '_');
  const isAdmin = ['SYSTEM_ADMIN', 'DIRECTOR', 'SUPER'].includes(userRole);
  const isManager = ['SYSTEM_ADMIN', 'DIRECTOR', 'MANAGER', 'SUPER', 'ASS_MANAGER'].includes(userRole);

  const displayBusinesses = useMemo(() => {
    if (isAdmin) return businesses;
    if (isManager) {
      return businesses.filter(biz => {
        const isManagerOf = biz.head_manager_id === user?.id || biz.ass_manager_id === user?.id;
        const matchesBizType = user?.businessType && (
          String(biz.id) === String(user.businessType).trim() ||
          biz.name.toLowerCase().trim() === String(user.businessType).toLowerCase().trim() ||
          biz.name.toLowerCase().includes(String(user.businessType).toLowerCase().trim()) ||
          String(user.businessType).toLowerCase().trim().includes(biz.name.toLowerCase().trim())
        );
        return isManagerOf || matchesBizType;
      });
    }
    return [];
  }, [businesses, isAdmin, isManager, user]);

  useEffect(() => {
    if (displayBusinesses.length > 0 && !selectedBusiness) {
      const initialBiz = String(displayBusinesses[0].id);
      setSelectedBusiness(initialBiz);
      localStorage.setItem('activeBusinessId', initialBiz);
      window.dispatchEvent(new CustomEvent('business_changed', { detail: { businessId: initialBiz } }));
    }
  }, [displayBusinesses, selectedBusiness]);

  const displayBatches = useMemo(() => {
    if (!selectedBusiness) return [];
    if (selectedBusiness === 'ALL') {
      const allowedBizIds = new Set(displayBusinesses.map(b => b.id));
      return batches.filter(b => allowedBizIds.has(b.businessId));
    }
    return batches.filter(b => b.businessId === parseInt(selectedBusiness));
  }, [batches, selectedBusiness, displayBusinesses]);

  useEffect(() => {
    if (selectedBusiness) {
      fetchManagerStats();
      fetchRealtimeChatSummary();
    } else {
      setLoading(false);
    }
  }, [selectedBusiness, selectedBatch]);

  // Periodic refresh for live chat summary (every 30 seconds)
  useEffect(() => {
    if (!selectedBusiness) return;
    const interval = setInterval(() => {
      fetchRealtimeChatSummary(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [selectedBusiness, selectedBatch, displayBusinesses]);

  const fetchRealtimeChatSummary = async (isBackground = false) => {
    if (!isBackground) setRealtimeLoading(true);
    try {
      const bizIds = selectedBusiness === 'ALL' ? displayBusinesses.map(b => b.id).join(',') : undefined;
      const res = await axios.get('/coordinator-crm/realtime-chat-summary', {
        params: {
          businessId: selectedBusiness,
          batchId: selectedBatch || 'ALL',
          businessIds: bizIds
        }
      });
      if (res.data?.success) {
        setRealtimeChatSummary({
          afterSeminar: res.data.afterSeminar || { totalUnread: 0, newUnread: 0, newTotal: 0, expiringSoon: 0, expired: 0, active: 0 },
          freeSeminar: res.data.freeSeminar || { totalUnread: 0, newUnread: 0, newTotal: 0, expiringSoon: 0, expired: 0, active: 0 }
        });
      }
    } catch (err) {
      console.error('Error loading realtime chat summary:', err);
    } finally {
      if (!isBackground) setRealtimeLoading(false);
    }
  };

  const fetchManagerStats = async () => {
    setStatsLoading(true);
    try {
      const res = await axios.get('/admin/manager/dashboard-stats', {
        params: { businessId: selectedBusiness, batchId: selectedBatch || 'ALL' }
      });
      if (res.data) setStats(res.data);
    } catch (error) {
      console.error("Error loading manager stats:", error);
    } finally {
      setLoading(false);
      setStatsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-[60vh] flex items-center justify-center">
        <FaSpinner className="animate-spin text-4xl text-brand-accent" />
      </div>
    );
  }

  const activeBusinessName = selectedBusiness === 'ALL' 
    ? 'All My Businesses' 
    : (businesses.find(b => String(b.id) === selectedBusiness)?.name || 'My Branch');
  const formatCurrency = (amount) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 }).format(amount);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const LEAD_COLORS = ['#ec4899', '#3b82f6', '#f59e0b'];
  const leadTypeData = [
    { name: 'Open Seminar', value: stats.leadStats.openSem },
    { name: 'New Inquiries', value: stats.leadStats.newInq },
    { name: 'Bridge Transfer', value: stats.leadStats.bridge }
  ].filter(d => d.value > 0);

  const formattedMixerData = (() => {
    if (!stats.mixerData || !Array.isArray(stats.mixerData)) return [];
    const subjectMap = new Map();
    stats.mixerData.forEach(item => {
      const full = Number(item.full) || 0;
      const monthly = Number(item.monthly) || 0;
      const installment = Number(item.installment) || 0;
      const total = full + monthly + installment;
      const shortName = formatShortSubject(item.subject);

      if (subjectMap.has(shortName)) {
        const existing = subjectMap.get(shortName);
        existing.full += full;
        existing.monthly += monthly;
        existing.installment += installment;
        existing.total += total;
      } else {
        subjectMap.set(shortName, {
          ...item,
          subject: shortName,
          fullSubject: item.subject,
          full,
          monthly,
          installment,
          total
        });
      }
    });
    return Array.from(subjectMap.values()).sort((a, b) => b.total - a.total);
  })();

  return (
    <div className="space-y-6 animate-fade-in text-left pb-10 max-w-[1600px] mx-auto">
      
      {/* 🔹 Top Banner Greet & Filter (Compact) */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white/5 backdrop-blur-md p-5 rounded-[2rem] border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              System Overview
            </h2>
            {activeBusinessName && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 backdrop-blur-sm shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                {activeBusinessName}
              </span>
            )}
          </div>
          <p className="text-[11px] font-bold text-gray-500 dark:text-slate-400 mt-1 uppercase tracking-widest flex items-center gap-2">
            <FaCalendarAlt className="text-slate-500" /> {today}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2 bg-white/60 dark:bg-[#1a2430]/60 px-4 py-2 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm">
            <FaFilter className="text-indigo-400 shrink-0 text-sm" />
            {(isAdmin || (isManager && displayBusinesses.length > 1)) && (
              <select
                value={selectedBusiness}
                onChange={(e) => { 
                  setSelectedBusiness(e.target.value); 
                  setSelectedBatch('ALL'); 
                  if (e.target.value !== 'ALL') localStorage.setItem('activeBusinessId', e.target.value);
                  window.dispatchEvent(new CustomEvent('business_changed', { detail: { businessId: e.target.value } }));
                }}
                className="bg-transparent text-gray-800 dark:text-slate-300 text-xs font-bold rounded-xl px-2 outline-none cursor-pointer"
              >
                {displayBusinesses.length > 1 && (
                  <option value="ALL" className="bg-white dark:bg-[#1a2430]">All My Businesses</option>
                )}
                {displayBusinesses.map(biz => <option key={biz.id} value={biz.id} className="bg-white dark:bg-[#1a2430]">{biz.name}</option>)}
              </select>
            )}
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="bg-transparent text-gray-800 dark:text-slate-300 text-xs font-bold rounded-xl px-2 outline-none cursor-pointer border-l border-gray-300 dark:border-white/10 ml-2 pl-3"
            >
              <option value="ALL" className="bg-white dark:bg-[#1a2430]">All Batches</option>
              {displayBatches.map(b => <option key={b.id} value={b.id} className="bg-white dark:bg-[#1a2430]">{b.name}</option>)}
            </select>
          </div>
          <Link
            to="/manager/tute-stock"
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-xl border border-amber-400/30 flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <span>📦</span> Tute Stock & Calendar
          </Link>
          <button 
            onClick={() => setIsDelegateModalOpen(true)}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-xl border border-indigo-400/30 flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
          >
            <span>🚀</span> Delegate Work
          </button>
          <span className="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 text-[10px] font-black tracking-widest uppercase border border-emerald-200 dark:border-emerald-500/20 px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm">
            <FaCircle className="text-[7px] animate-pulse text-emerald-500" /> Live
          </span>
        </div>
      </div>

      <DelegateSocialMediaTaskModal 
        isOpen={isDelegateModalOpen} 
        onClose={() => setIsDelegateModalOpen(false)} 
        loggedInUser={user} 
      />

      {/* 🔹 Realtime Overview: 1st Tile (After Seminar CRM) & 2nd Tile (Free Seminar CRM) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* 🎯 1ST TILE: AFTER SEMINAR CRM 🎯 */}
        <div 
          onClick={() => navigate('/workspace/after-seminar-crm')}
          className="relative overflow-hidden rounded-[2rem] p-6 bg-gradient-to-br from-[#1e1435]/90 via-[#16132b]/80 to-[#0e1726]/90 border border-purple-500/30 hover:border-purple-400/60 shadow-[0_8px_30px_rgb(0,0,0,0.25)] hover:shadow-[0_12px_40px_rgba(168,85,247,0.2)] transition-all duration-300 cursor-pointer group hover:-translate-y-1"
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-12 -right-12 w-44 h-44 bg-purple-600/15 rounded-full blur-3xl pointer-events-none group-hover:bg-purple-600/25 transition-all"></div>
          
          <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#25D366]/15 border border-[#25D366]/30 flex items-center justify-center text-[#25D366] shadow-lg shadow-[#25D366]/10 group-hover:scale-105 transition-transform">
                  <FaWhatsapp size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white tracking-wide flex items-center gap-2">
                    AFTER SEMINAR CRM
                  </h3>
                  <p className="text-[10px] font-bold text-purple-300/70 uppercase tracking-widest">
                    Post-Seminar Conversions
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-black tracking-widest uppercase border border-emerald-500/20 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                  <FaCircle className="text-[6px] animate-pulse text-emerald-400" /> Live
                </span>
                <span className="text-purple-400/60 group-hover:text-purple-300 text-xs transition-colors">
                  <FaExternalLinkAlt size={12} />
                </span>
              </div>
            </div>

            {/* Unread Chats Count */}
            <div className="flex items-baseline justify-between pt-1">
              <div className="flex items-center flex-wrap gap-2">
                <span className="text-4xl lg:text-5xl font-black text-white tracking-tight drop-shadow-md">
                  {realtimeLoading ? '...' : Number(realtimeChatSummary.afterSeminar.totalUnread || 0).toLocaleString()}
                </span>
                <span className="text-xs font-black text-purple-200/80 uppercase tracking-wider ml-1">
                  Unread Chats
                </span>
                {(realtimeChatSummary.afterSeminar.newUnread > 0 || realtimeChatSummary.afterSeminar.newTotal > 0) && (
                  <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm shadow-cyan-500/10 ml-2 animate-pulse">
                    <FaInbox size={10} /> {realtimeChatSummary.afterSeminar.newUnread} New
                  </span>
                )}
              </div>
              <span className="text-[11px] font-bold text-purple-300/80 group-hover:text-white flex items-center gap-1 transition-colors">
                Open CRM <FaArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </div>

            {/* Status Breakdown Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/5">
              {/* New (Unassigned) */}
              <div className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition-colors ${
                (realtimeChatSummary.afterSeminar.newUnread || 0) > 0
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 shadow-sm shadow-cyan-500/10'
                  : 'bg-white/[0.02] border-white/5 text-slate-400'
              }`}>
                <span className="text-[9px] font-black uppercase tracking-wider flex items-center gap-1 mb-0.5">
                  <FaInbox size={9} className="text-cyan-400" /> New (Unassigned)
                </span>
                <span className="text-base font-black text-cyan-300">
                  {realtimeLoading ? '...' : (realtimeChatSummary.afterSeminar.newUnread || 0)}
                </span>
                {(realtimeChatSummary.afterSeminar.newTotal || 0) > 0 && (
                  <span className="text-[8px] font-bold text-slate-400 opacity-70">
                    Total: {realtimeChatSummary.afterSeminar.newTotal}
                  </span>
                )}
              </div>

              {/* Expiring Soon (<4h) */}
              <div className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition-colors ${
                (realtimeChatSummary.afterSeminar.expiringSoon || 0) > 0
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-300 shadow-sm shadow-amber-500/10 animate-pulse'
                  : 'bg-white/[0.02] border-white/5 text-slate-400'
              }`}>
                <span className="text-[9px] font-black uppercase tracking-wider flex items-center gap-1 mb-0.5">
                  <FaClock size={9} className="text-amber-400" /> Expiring &lt;4h
                </span>
                <span className="text-base font-black text-amber-300">
                  {realtimeLoading ? '...' : (realtimeChatSummary.afterSeminar.expiringSoon || 0)}
                </span>
              </div>

              {/* Expired (>=24h) */}
              <div className="p-2.5 rounded-xl border bg-white/[0.02] border-white/5 flex flex-col items-center justify-center text-center">
                <span className="text-[9px] font-black uppercase tracking-wider text-rose-300/80 flex items-center gap-1 mb-0.5">
                  <FaExclamationTriangle size={9} className="text-rose-400" /> Expired &ge;24h
                </span>
                <span className="text-base font-black text-rose-300">
                  {realtimeLoading ? '...' : (realtimeChatSummary.afterSeminar.expired || 0)}
                </span>
              </div>

              {/* Active (<20h) */}
              <div className="p-2.5 rounded-xl border bg-white/[0.02] border-white/5 flex flex-col items-center justify-center text-center">
                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-300/80 flex items-center gap-1 mb-0.5">
                  <FaCheckCircle size={9} className="text-emerald-400" /> Active &lt;20h
                </span>
                <span className="text-base font-black text-emerald-300">
                  {realtimeLoading ? '...' : (realtimeChatSummary.afterSeminar.active || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 🎯 2ND TILE: FREE SEMINAR CRM 🎯 */}
        <div 
          onClick={() => navigate('/workspace/crm')}
          className="relative overflow-hidden rounded-[2rem] p-6 bg-gradient-to-br from-[#0e2a22]/90 via-[#0d221d]/80 to-[#0e1726]/90 border border-emerald-500/30 hover:border-emerald-400/60 shadow-[0_8px_30px_rgb(0,0,0,0.25)] hover:shadow-[0_12px_40px_rgba(16,185,129,0.2)] transition-all duration-300 cursor-pointer group hover:-translate-y-1"
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-12 -right-12 w-44 h-44 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-600/25 transition-all"></div>
          
          <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#25D366]/15 border border-[#25D366]/30 flex items-center justify-center text-[#25D366] shadow-lg shadow-[#25D366]/10 group-hover:scale-105 transition-transform">
                  <FaWhatsapp size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white tracking-wide flex items-center gap-2">
                    FREE SEMINAR CRM
                  </h3>
                  <p className="text-[10px] font-bold text-emerald-300/70 uppercase tracking-widest">
                    Inbound Leads & Registrations
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-black tracking-widest uppercase border border-emerald-500/20 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                  <FaCircle className="text-[6px] animate-pulse text-emerald-400" /> Live
                </span>
                <span className="text-emerald-400/60 group-hover:text-emerald-300 text-xs transition-colors">
                  <FaExternalLinkAlt size={12} />
                </span>
              </div>
            </div>

            {/* Unread Chats Count */}
            <div className="flex items-baseline justify-between pt-1">
              <div className="flex items-center flex-wrap gap-2">
                <span className="text-4xl lg:text-5xl font-black text-white tracking-tight drop-shadow-md">
                  {realtimeLoading ? '...' : Number(realtimeChatSummary.freeSeminar.totalUnread || 0).toLocaleString()}
                </span>
                <span className="text-xs font-black text-emerald-200/80 uppercase tracking-wider ml-1">
                  Unread Chats
                </span>
                {(realtimeChatSummary.freeSeminar.newUnread > 0 || realtimeChatSummary.freeSeminar.newTotal > 0) && (
                  <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm shadow-cyan-500/10 ml-2 animate-pulse">
                    <FaInbox size={10} /> {realtimeChatSummary.freeSeminar.newUnread} New
                  </span>
                )}
              </div>
              <span className="text-[11px] font-bold text-emerald-300/80 group-hover:text-white flex items-center gap-1 transition-colors">
                Open CRM <FaArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </div>

            {/* Status Breakdown Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/5">
              {/* New (Unassigned) */}
              <div className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition-colors ${
                (realtimeChatSummary.freeSeminar.newUnread || 0) > 0
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 shadow-sm shadow-cyan-500/10'
                  : 'bg-white/[0.02] border-white/5 text-slate-400'
              }`}>
                <span className="text-[9px] font-black uppercase tracking-wider flex items-center gap-1 mb-0.5">
                  <FaInbox size={9} className="text-cyan-400" /> New (Unassigned)
                </span>
                <span className="text-base font-black text-cyan-300">
                  {realtimeLoading ? '...' : (realtimeChatSummary.freeSeminar.newUnread || 0)}
                </span>
                {(realtimeChatSummary.freeSeminar.newTotal || 0) > 0 && (
                  <span className="text-[8px] font-bold text-slate-400 opacity-70">
                    Total: {realtimeChatSummary.freeSeminar.newTotal}
                  </span>
                )}
              </div>

              {/* Expiring Soon (<4h) */}
              <div className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition-colors ${
                (realtimeChatSummary.freeSeminar.expiringSoon || 0) > 0
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-300 shadow-sm shadow-amber-500/10 animate-pulse'
                  : 'bg-white/[0.02] border-white/5 text-slate-400'
              }`}>
                <span className="text-[9px] font-black uppercase tracking-wider flex items-center gap-1 mb-0.5">
                  <FaClock size={9} className="text-amber-400" /> Expiring &lt;4h
                </span>
                <span className="text-base font-black text-amber-300">
                  {realtimeLoading ? '...' : (realtimeChatSummary.freeSeminar.expiringSoon || 0)}
                </span>
              </div>

              {/* Expired (>=24h) */}
              <div className="p-2.5 rounded-xl border bg-white/[0.02] border-white/5 flex flex-col items-center justify-center text-center">
                <span className="text-[9px] font-black uppercase tracking-wider text-rose-300/80 flex items-center gap-1 mb-0.5">
                  <FaExclamationTriangle size={9} className="text-rose-400" /> Expired &ge;24h
                </span>
                <span className="text-base font-black text-rose-300">
                  {realtimeLoading ? '...' : (realtimeChatSummary.freeSeminar.expired || 0)}
                </span>
              </div>

              {/* Active (<20h) */}
              <div className="p-2.5 rounded-xl border bg-white/[0.02] border-white/5 flex flex-col items-center justify-center text-center">
                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-300/80 flex items-center gap-1 mb-0.5">
                  <FaCheckCircle size={9} className="text-emerald-400" /> Active &lt;20h
                </span>
                <span className="text-base font-black text-emerald-300">
                  {realtimeLoading ? '...' : (realtimeChatSummary.freeSeminar.active || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

      <div className="mt-4">
        <CampaignSummaryTiles businessId={selectedBusiness} batchId={selectedBatch || 'ALL'} />
      </div>

      {statsLoading ? (
        <div className="flex flex-col justify-center items-center h-[300px] text-brand-accent font-sans font-black gap-4 bg-white/50 dark:bg-white/[0.02] rounded-[2rem] border border-white/5 backdrop-blur-md">
          <FaSpinner className="animate-spin text-4xl" /> Analyzing System Data...
        </div>
      ) : (
        <>
          {/* 🔹 Row 1: Massive KPI Grid (6 Columns on Large Screens) */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            
            {/* Verified Revenue */}
            <div className="bg-white/70 dark:bg-white/[0.03] backdrop-blur-2xl p-4 rounded-3xl border border-gray-200 dark:border-white/10 shadow-lg hover:-translate-y-1 transition-transform group">
              <div className="flex justify-between items-start mb-2">
                <p className="text-[9px] text-gray-500 dark:text-slate-400 font-black uppercase tracking-widest">Revenue</p>
                <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl flex justify-center items-center"><FaMoneyBillWave size={14}/></div>
              </div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white truncate">{formatCurrency(stats.totalRevenue)}</h2>
            </div>

            {/* Total Leads & Unassigned Alert */}
            <div className="bg-white/70 dark:bg-white/[0.03] backdrop-blur-2xl p-4 rounded-3xl border border-gray-200 dark:border-white/10 shadow-lg hover:-translate-y-1 transition-transform group">
              <div className="flex justify-between items-start mb-2">
                <p className="text-[9px] text-gray-500 dark:text-slate-400 font-black uppercase tracking-widest">CRM Leads</p>
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl flex justify-center items-center"><FaUsers size={14}/></div>
              </div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                {stats.leadStats.total}
                {stats.leadStats.unassigned > 0 && <span className="text-[10px] bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-md flex items-center gap-1"><FaExclamationCircle/> {stats.leadStats.unassigned} unassigned</span>}
              </h2>
            </div>

            {/* Active Students */}
            <div className="bg-white/70 dark:bg-white/[0.03] backdrop-blur-2xl p-4 rounded-3xl border border-gray-200 dark:border-white/10 shadow-lg hover:-translate-y-1 transition-transform group">
              <div className="flex justify-between items-start mb-2">
                <p className="text-[9px] text-gray-500 dark:text-slate-400 font-black uppercase tracking-widest">Active Students</p>
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-xl flex justify-center items-center"><FaUserClock size={14}/></div>
              </div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white">{stats.activeStudentsCount}</h2>
            </div>

            {/* Logistics Preview */}
            <Link to="/manager/tute-stock" className="bg-white/70 dark:bg-white/[0.03] backdrop-blur-2xl p-4 rounded-3xl border border-gray-200 dark:border-white/10 shadow-lg hover:-translate-y-1 transition-transform group cursor-pointer block">
              <div className="flex justify-between items-start mb-2">
                <p className="text-[9px] text-gray-500 dark:text-slate-400 font-black uppercase tracking-widest">Tutes & Delivery</p>
                <div className="w-8 h-8 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl flex justify-center items-center group-hover:scale-110 transition-transform"><FaTruck size={14}/></div>
              </div>
              <div className="flex gap-2 text-xs font-black">
                <span className="text-gray-700 dark:text-slate-300 flex items-center gap-1"><FaClock className="text-amber-500"/> {stats.deliveryStats.pending}</span>
                <span className="text-gray-700 dark:text-slate-300 flex items-center gap-1"><FaCheckCircle className="text-emerald-500"/> {stats.deliveryStats.delivered}</span>
              </div>
            </Link>

            {/* System Tasks */}
            <div className="bg-white/70 dark:bg-white/[0.03] backdrop-blur-2xl p-4 rounded-3xl border border-gray-200 dark:border-white/10 shadow-lg hover:-translate-y-1 transition-transform group">
              <div className="flex justify-between items-start mb-2">
                <p className="text-[9px] text-gray-500 dark:text-slate-400 font-black uppercase tracking-widest">System Tasks</p>
                <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl flex justify-center items-center"><FaInbox size={14}/></div>
              </div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white">{stats.pendingTasks} Pending</h2>
            </div>

            {/* WhatsApp CRM Msgs Today */}
            <div className="bg-white/70 dark:bg-white/[0.03] backdrop-blur-2xl p-4 rounded-3xl border border-gray-200 dark:border-white/10 shadow-lg hover:-translate-y-1 transition-transform group">
              <div className="flex justify-between items-start mb-2">
                <p className="text-[9px] text-gray-500 dark:text-slate-400 font-black uppercase tracking-widest">Today's CRM Msgs</p>
                <div className="w-8 h-8 bg-brand-accentLight dark:bg-brand-accent/20 text-brand-accent rounded-xl flex justify-center items-center"><FaComments size={14}/></div>
              </div>
              <div className="flex gap-2 text-xs font-black">
                <span className="text-gray-700 dark:text-slate-300">In: {stats.crmMessages.received}</span>
                <span className="text-brand-accent">Out: {stats.crmMessages.replied}</span>
              </div>
            </div>
          </div>

          {/* 🔹 Row 2: Deep Analytics & Academic Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Subject Enrollment Breakdown */}
            <div className="bg-white/70 dark:bg-[#0c111e]/90 backdrop-blur-2xl p-6 rounded-[2rem] border border-gray-200 dark:border-cyan-500/20 shadow-xl dark:shadow-[0_10px_35px_rgba(6,182,212,0.08)] lg:col-span-2 flex flex-col relative overflow-hidden">
              {/* Subtle Ambient Glow */}
              <div className="absolute -top-20 -right-20 w-52 h-52 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 dark:border-white/10 pb-4 mb-4 relative z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.2)]">
                    <FaChartLine size={14} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                      Course Enrollments
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 normal-case tracking-normal">
                        Cyber Dual Bars
                      </span>
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                      Direct comparison: Full Payment vs Monthly Plan
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Toggle numbers on bars (when in chart view) */}
                  {enrollmentViewMode === 'chart' && formattedMixerData.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowBarValues(v => !v)}
                      className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                        showBarValues
                          ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                          : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                      }`}
                      title="Toggle count labels on bars"
                    >
                      {showBarValues ? <FaEye size={10} /> : <FaEyeSlash size={10} />}
                      <span>{showBarValues ? 'Labels ON' : 'Labels OFF'}</span>
                    </button>
                  )}

                  {/* Mode switcher: Chart vs Table */}
                  <div className="flex bg-slate-900/60 p-1 rounded-xl border border-white/10 shadow-inner">
                    <button
                      type="button"
                      onClick={() => setEnrollmentViewMode('chart')}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        enrollmentViewMode === 'chart'
                          ? 'bg-cyan-600 text-white shadow-md shadow-cyan-500/20'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <FaChartBar size={10} /> Chart
                    </button>
                    <button
                      type="button"
                      onClick={() => setEnrollmentViewMode('table')}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        enrollmentViewMode === 'table'
                          ? 'bg-cyan-600 text-white shadow-md shadow-cyan-500/20'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <FaTable size={10} /> Table
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 min-h-[300px] relative z-10">
                {(!formattedMixerData || formattedMixerData.length === 0) ? (
                  <div className="flex h-full items-center justify-center text-gray-500 dark:text-slate-500 text-sm font-bold bg-gray-50 dark:bg-white/[0.01] rounded-2xl border border-dashed border-gray-300 dark:border-white/10 p-6">
                    No course enrollment data found.
                  </div>
                ) : enrollmentViewMode === 'chart' ? (
                  <div className="w-full h-full flex flex-col justify-between">
                    <ResponsiveContainer width="100%" height={290}>
                      <BarChart 
                        data={formattedMixerData} 
                        margin={{ top: 25, right: 15, left: -20, bottom: 20 }}
                        barGap={4}
                        barCategoryGap="16%"
                      >
                        <defs>
                          {/* Neon Cyan Gradient for Full Payment */}
                          <linearGradient id="gradFull" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#22d3ee" stopOpacity={1}/>
                            <stop offset="100%" stopColor="#0891b2" stopOpacity={0.95}/>
                          </linearGradient>
                          {/* Neon Fuchsia Gradient for Monthly */}
                          <linearGradient id="gradMonthly" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f472b6" stopOpacity={1}/>
                            <stop offset="100%" stopColor="#c026d3" stopOpacity={0.95}/>
                          </linearGradient>
                          {/* Amber Gradient for Installments */}
                          <linearGradient id="gradInstallment" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#fbbf24" stopOpacity={1}/>
                            <stop offset="100%" stopColor="#d97706" stopOpacity={0.95}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#94a3b815" vertical={false} />
                        <XAxis 
                          dataKey="subject" 
                          interval={0}
                          tick={<CustomEnrollmentXAxisTick data={formattedMixerData} />} 
                          height={52}
                          tickLine={false} 
                          axisLine={false} 
                        />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip content={<CustomEnrollmentTooltip data={formattedMixerData} />} cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }} />
                        
                        {/* ⚡ Cyan Dual Bar (Full Payment) - FLAT TOP (radius=0) */}
                        <Bar 
                          dataKey="full" 
                          name="Full Payment" 
                          fill="url(#gradFull)" 
                          radius={[0, 0, 0, 0]} 
                          maxBarSize={24}
                        >
                          {showBarValues && (
                            <LabelList 
                              dataKey="full" 
                              position="top" 
                              fill="#22d3ee" 
                              fontSize={10} 
                              fontWeight="800" 
                              offset={6}
                              formatter={(v) => v > 0 ? v : ''} 
                            />
                          )}
                        </Bar>

                        {/* ⚡ Fuchsia Dual Bar (Monthly) - FLAT TOP (radius=0) */}
                        <Bar 
                          dataKey="monthly" 
                          name="Monthly" 
                          fill="url(#gradMonthly)" 
                          radius={[0, 0, 0, 0]} 
                          maxBarSize={24}
                        >
                          {showBarValues && (
                            <LabelList 
                              dataKey="monthly" 
                              position="top" 
                              fill="#f472b6" 
                              fontSize={10} 
                              fontWeight="800" 
                              offset={6}
                              formatter={(v) => v > 0 ? v : ''} 
                            />
                          )}
                        </Bar>

                        {/* Optional Installment Bar if any exists - FLAT TOP (radius=0) */}
                        {formattedMixerData.some(d => d.installment > 0) && (
                          <Bar 
                            dataKey="installment" 
                            name="Installments" 
                            fill="url(#gradInstallment)" 
                            radius={[0, 0, 0, 0]} 
                            maxBarSize={24}
                          >
                            {showBarValues && (
                              <LabelList 
                                dataKey="installment" 
                                position="top" 
                                fill="#fbbf24" 
                                fontSize={10} 
                                fontWeight="800" 
                                offset={6}
                                formatter={(v) => v > 0 ? v : ''} 
                              />
                            )}
                          </Bar>
                        )}
                      </BarChart>
                    </ResponsiveContainer>

                    {/* Clean Cyber Legend & Summary Footer with Totals at the BOTTOM (Yatin) */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10 mt-2">
                      {/* Legend with Neon Glows */}
                      <div className="flex items-center gap-3 bg-white/[0.03] border border-white/10 px-3.5 py-1.5 rounded-xl text-xs font-black">
                        <div className="flex items-center gap-2 text-cyan-300">
                          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                          Full Payment
                        </div>
                        <span className="w-px h-3 bg-white/10"></span>
                        <div className="flex items-center gap-2 text-fuchsia-300">
                          <span className="w-2.5 h-2.5 rounded-full bg-fuchsia-400 shadow-[0_0_8px_#e879f9]"></span>
                          Monthly
                        </div>
                        {formattedMixerData.some(d => d.installment > 0) && (
                          <>
                            <span className="w-px h-3 bg-white/10"></span>
                            <div className="flex items-center gap-2 text-amber-300">
                              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]"></span>
                              Installments
                            </div>
                          </>
                        )}
                      </div>

                      {/* Summary Totals at the bottom */}
                      {(() => {
                        const grandTotal = formattedMixerData.reduce((acc, r) => acc + r.total, 0);
                        const fullTotal = formattedMixerData.reduce((acc, r) => acc + r.full, 0);
                        const monthlyTotal = formattedMixerData.reduce((acc, r) => acc + r.monthly, 0);
                        return (
                          <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
                            <span>Total Enrolled: <strong className="text-white font-mono font-black">{grandTotal.toLocaleString()}</strong></span>
                            <span className="text-white/20">|</span>
                            <span>Full: <strong className="text-cyan-400 font-mono font-black">{fullTotal.toLocaleString()}</strong> <span className="text-[10px] text-cyan-500 font-normal">({grandTotal > 0 ? Math.round((fullTotal/grandTotal)*100) : 0}%)</span></span>
                            <span className="text-white/20">|</span>
                            <span>Monthly: <strong className="text-fuchsia-400 font-mono font-black">{monthlyTotal.toLocaleString()}</strong> <span className="text-[10px] text-fuchsia-500 font-normal">({grandTotal > 0 ? Math.round((monthlyTotal/grandTotal)*100) : 0}%)</span></span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[340px] overflow-y-auto pr-1">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/10 text-slate-400 font-bold uppercase tracking-wider text-[10px] sticky top-0 bg-[#0f172a] z-10">
                          <th className="pb-3 pl-2">Subject</th>
                          <th className="pb-3 text-right">Total</th>
                          <th className="pb-3 text-right">Full Paid</th>
                          <th className="pb-3 text-right">Monthly</th>
                          <th className="pb-3 text-right">Installments</th>
                          <th className="pb-3 pl-6 pr-2">Payment Ratio</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {formattedMixerData.map((row) => {
                          const fullPct = row.total > 0 ? Math.round((row.full / row.total) * 100) : 0;
                          const monthlyPct = row.total > 0 ? Math.round((row.monthly / row.total) * 100) : 0;
                          const instPct = row.total > 0 ? Math.round((row.installment / row.total) * 100) : 0;
                          return (
                            <tr key={row.subject} className="hover:bg-white/[0.02] transition-colors">
                              <td className="py-2.5 pl-2 font-black text-white">{row.fullSubject || row.subject}</td>
                              <td className="py-2.5 text-right font-black text-white font-mono">{row.total}</td>
                              <td className="py-2.5 text-right font-bold font-mono text-cyan-400">
                                {row.full} <span className="text-[10px] text-cyan-500/80 font-sans font-normal">({fullPct}%)</span>
                              </td>
                              <td className="py-2.5 text-right font-bold font-mono text-fuchsia-400">
                                {row.monthly} <span className="text-[10px] text-fuchsia-500/80 font-sans font-normal">({monthlyPct}%)</span>
                              </td>
                              <td className="py-2.5 text-right font-bold font-mono text-amber-400">
                                {row.installment} <span className="text-[10px] text-amber-500/80 font-sans font-normal">({instPct}%)</span>
                              </td>
                              <td className="py-2.5 pl-6 pr-2">
                                <div className="w-36 h-2 rounded-full bg-slate-800 flex overflow-hidden">
                                  <div style={{ width: `${fullPct}%` }} className="bg-gradient-to-r from-cyan-500 to-teal-400 h-full" title={`Full: ${row.full} (${fullPct}%)`} />
                                  <div style={{ width: `${monthlyPct}%` }} className="bg-gradient-to-r from-fuchsia-500 to-pink-500 h-full" title={`Monthly: ${row.monthly} (${monthlyPct}%)`} />
                                  <div style={{ width: `${instPct}%` }} className="bg-amber-500 h-full" title={`Installments: ${row.installment} (${instPct}%)`} />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-white/10 font-black text-white bg-white/[0.02] sticky bottom-0 z-10">
                          <td className="py-3 pl-2 uppercase text-[10px] tracking-wider text-slate-400">Grand Total</td>
                          <td className="py-3 text-right font-mono text-white text-sm">
                            {formattedMixerData.reduce((acc, r) => acc + r.total, 0).toLocaleString()}
                          </td>
                          <td className="py-3 text-right font-mono text-cyan-400">
                            {formattedMixerData.reduce((acc, r) => acc + r.full, 0).toLocaleString()}
                          </td>
                          <td className="py-3 text-right font-mono text-fuchsia-400">
                            {formattedMixerData.reduce((acc, r) => acc + r.monthly, 0).toLocaleString()}
                          </td>
                          <td className="py-3 text-right font-mono text-amber-400">
                            {formattedMixerData.reduce((acc, r) => acc + r.installment, 0).toLocaleString()}
                          </td>
                          <td className="py-3 pl-6 pr-2 text-[10px] text-slate-400">100% verified</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Student Age Distribution Card (Option 3: Bento Donut + Progress Bars) */}
            <div className="bg-white/70 dark:bg-[#0c111e]/90 backdrop-blur-2xl p-6 rounded-[2rem] border border-gray-200 dark:border-cyan-500/20 shadow-xl dark:shadow-[0_10px_35px_rgba(6,182,212,0.08)] flex flex-col justify-between relative overflow-hidden">
              {/* Subtle Ambient Glow */}
              <div className="absolute -top-16 -right-16 w-44 h-44 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

              {/* Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-gray-200 dark:border-white/10 relative z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                    <FaChartPie size={13} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-1.5">
                      Student Age
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 normal-case tracking-normal">
                        NIC Verified
                      </span>
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">Demographic breakdown</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-400 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                  Median: <strong className="text-cyan-300">{stats.studentAgeStats?.medianAge || 20} Yrs</strong>
                </span>
              </div>

              {/* Body: Donut on Left + Progress Bars on Right */}
              {(() => {
                const ageGroups = (stats.studentAgeStats && Array.isArray(stats.studentAgeStats.groups) && stats.studentAgeStats.groups.length > 0)
                  ? stats.studentAgeStats.groups
                  : [];
                const totalAnalyzed = stats.studentAgeStats?.totalAnalyzed || 0;

                if (totalAnalyzed === 0 || ageGroups.length === 0) {
                  return (
                    <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-slate-500 text-sm font-bold bg-gray-50 dark:bg-white/[0.01] rounded-2xl border border-dashed border-gray-300 dark:border-white/10 p-6 my-4">
                      No demographic data found.
                    </div>
                  );
                }

                return (
                  <div className="flex flex-col sm:flex-row items-center gap-5 py-4 relative z-10">
                    {/* Enlarged Donut Chart (w-48 h-48 = 192px) */}
                    <div className="relative w-44 h-44 sm:w-48 sm:h-48 shrink-0 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={ageGroups}
                            dataKey="count"
                            nameKey="group"
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={74}
                            paddingAngle={3}
                            stroke="none"
                          >
                            {ageGroups.map((entry, idx) => (
                              <Cell key={`cell-${idx}`} fill={entry.color} />
                            ))}
                          </Pie>
                          {/* 100% Solid Opaque High-Contrast Tooltip (NO blurry glass-on-glass) */}
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="!bg-[#020617] !opacity-100 border-2 border-cyan-400 p-3 rounded-xl shadow-[0_15px_40px_rgba(0,0,0,0.95)] text-xs text-white z-50 pointer-events-none min-w-[190px]">
                                    <div className="flex items-center gap-2 pb-1.5 mb-1.5 border-b border-white/10">
                                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: data.color, boxShadow: `0 0 8px ${data.color}` }}></span>
                                      <span className="font-black text-white text-xs">{data.group}</span>
                                    </div>
                                    <div className="flex items-baseline justify-between gap-3 font-mono">
                                      <span className="text-sm font-black text-cyan-300">
                                        {data.count.toLocaleString()} <span className="text-[10px] font-sans font-normal text-slate-400">students</span>
                                      </span>
                                      <span className="text-xs font-black text-white bg-white/10 px-2 py-0.5 rounded">
                                        {data.pct}%
                                      </span>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none select-none">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Students</span>
                        <span className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight drop-shadow">{totalAnalyzed.toLocaleString()}</span>
                        <span className="text-[9px] font-bold text-cyan-300">Total</span>
                      </div>
                    </div>

                    {/* Right Rows: Space Fully Utilized! Group, Count & Pct together, full-width progress bar */}
                    <div className="flex-1 w-full space-y-2">
                      {ageGroups.map((a) => (
                        <div key={a.group} className="bg-white/[0.03] hover:bg-white/[0.06] p-2 rounded-xl border border-white/5 transition-all group">
                          <div className="flex items-center justify-between text-xs font-bold mb-1">
                            <span className="flex items-center gap-1.5 text-slate-200">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: a.color, boxShadow: `0 0 6px ${a.color}80` }}></span>
                              <span className="font-extrabold text-[11px] text-white group-hover:text-cyan-300 transition-colors">{a.group}</span>
                            </span>
                            {/* Student Count + Percentage together */}
                            <div className="flex items-center gap-1.5 font-mono">
                              <span className="text-white font-black text-xs">{a.count.toLocaleString()}</span>
                              <span 
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold border" 
                                style={{ background: `${a.color}15`, color: a.color, borderColor: `${a.color}35` }}
                              >
                                {a.pct}%
                              </span>
                            </div>
                          </div>
                          {/* Progress Bar with slice color glow */}
                          <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden flex shadow-inner">
                            <div 
                              className="h-full rounded-full transition-all duration-500" 
                              style={{ width: `${a.pct}%`, background: a.color, boxShadow: `0 0 8px ${a.color}80` }} 
                              title={`${a.group}: ${a.count} (${a.pct}%)`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Footer */}
              <div className="pt-3 border-t border-gray-200 dark:border-white/10 flex items-center justify-between text-[11px] font-bold text-slate-400 relative z-10">
                <span>Primary Group: <strong className="text-cyan-300">18 - 19 Yrs</strong></span>
                <span>Total: <strong className="text-white font-mono">{(stats.studentAgeStats?.totalAnalyzed || 0).toLocaleString()}</strong></span>
              </div>
            </div>

          </div>

          {/* 🔹 Row 3: Live Operations (Classes & Coordinator Coverage) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Coordinator Daily Performance */}
            <div className="bg-white/70 dark:bg-white/[0.03] backdrop-blur-2xl p-6 rounded-[2rem] border border-gray-200 dark:border-white/10 shadow-xl flex flex-col h-[380px]">
              <h3 className="text-xs font-black text-gray-900 dark:text-white mb-6 uppercase tracking-widest flex items-center justify-between border-b border-gray-200 dark:border-white/5 pb-4">
                <span className="flex items-center gap-2"><FaUserClock className="text-brand-accent"/> Today's Lead Coverage</span>
                <span className="text-[9px] bg-brand-accentLight dark:bg-brand-accent/20 text-brand-accent px-2 py-1 rounded-md border border-brand-accent/20">Team Activity</span>
              </h3>
              <div className="flex-1">
                {(!stats.coordinatorStats || stats.coordinatorStats.length === 0) ? (
                  <div className="flex flex-col h-full items-center justify-center text-gray-500 dark:text-slate-500 text-sm font-bold gap-3 bg-gray-50 dark:bg-white/[0.01] rounded-2xl border border-dashed border-gray-300 dark:border-white/10 p-6">
                    <FaUserClock size={28} className="text-gray-300 dark:text-slate-600"/>
                    No leads actioned by staff today.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={stats.coordinatorStats} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} tickMargin={10} angle={-15} textAnchor="end"/>
                      <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', color: '#0f172a' }} />
                      <Bar dataKey="leadsCovered" name="Leads Covered Today" fill="#FF5F56" radius={[4, 4, 0, 0]} maxBarSize={40}>
                        {stats.coordinatorStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#FF5F56' : '#FFBD2E'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Today's Classes */}
            <div className="bg-white/70 dark:bg-white/[0.03] backdrop-blur-2xl p-6 rounded-[2rem] border border-gray-200 dark:border-white/10 shadow-xl flex flex-col h-[380px]">
              <h3 className="text-xs font-black text-gray-900 dark:text-white mb-4 uppercase tracking-widest flex items-center justify-between border-b border-gray-200 dark:border-white/5 pb-4">
                <span className="flex items-center gap-2"><FaCalendarCheck className="text-blue-500"/> Scheduled Classes</span>
                <span className="text-[9px] bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-md border border-blue-200 dark:border-blue-500/30">Today</span>
              </h3>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                {(!stats.todayClasses || stats.todayClasses.length === 0) ? (
                  <div className="flex flex-col h-full items-center justify-center text-gray-500 dark:text-slate-500 text-sm font-bold gap-3 bg-gray-50 dark:bg-white/[0.01] rounded-2xl border border-dashed border-gray-300 dark:border-white/10 p-6 text-center">
                    <FaChalkboardTeacher size={28} className="text-gray-300 dark:text-slate-600"/>
                    No classes scheduled for today.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stats.todayClasses.map((cls, idx) => (
                      <div key={idx} className="bg-gray-50 dark:bg-black/20 p-4 rounded-xl border border-gray-200 dark:border-white/5 hover:border-blue-300 dark:hover:border-blue-500/50 transition-colors shadow-sm relative overflow-hidden group">
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500 group-hover:w-2 transition-all"></div>
                        <div className="pl-3">
                          <h4 className="text-gray-900 dark:text-white font-black text-sm flex justify-between items-center">
                            {cls.subjectName || 'Class'}
                            <span className="text-[10px] bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 px-2 py-0.5 rounded-md border border-gray-200 dark:border-white/10 font-bold shadow-sm">
                              {cls.batch?.name || 'All Batches'}
                            </span>
                          </h4>
                          <div className="flex flex-wrap gap-3 mt-2 text-[11px] font-bold text-gray-600 dark:text-slate-400">
                            <span className="flex items-center gap-1 bg-white/50 dark:bg-white/5 px-2 py-1 rounded-md border border-gray-200 dark:border-white/5">
                              <FaClock className="text-brand-accent"/> {cls.startTime} - {cls.endTime}
                            </span>
                            <span className="flex items-center gap-1 bg-white/50 dark:bg-white/5 px-2 py-1 rounded-md border border-gray-200 dark:border-white/5">
                              <FaChalkboardTeacher className="text-emerald-500"/> {cls.lecturerName || 'Lecturer'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* 🔹 Row 4: WhatsApp Status, Limits & Meta Billing for Manager's Business */}
          <div className="w-full pt-2">
            <WhatsAppMetaMonitor 
              businessId={selectedBusiness}
              businessIds={selectedBusiness === 'ALL' ? displayBusinesses.map(b => b.id).join(',') : undefined}
              businessName={selectedBusiness === 'ALL' ? 'All My Businesses' : activeBusinessName}
            />
          </div>
        </>
      )}
    </div>
  );
}