import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from '../../../../api/axios';
import { 
  PhoneCall, AlertCircle, RefreshCw, Clock, CheckCircle2, 
  Search, X, ExternalLink, Calendar, Phone, UserCheck, Flame
} from 'lucide-react';

const REFRESH_INTERVAL_MS = 60 * 1000;

const CAMPAIGN_META = {
  OPEN_SEMINAR: { label: 'Open Sem', color: '#a855f7', bg: 'bg-purple-500', text: 'text-purple-400' },
  NEW_INQ: { label: 'New Inq', color: '#06b6d4', bg: 'bg-cyan-500', text: 'text-cyan-400' },
  PAID: { label: 'Paid', color: '#10b981', bg: 'bg-emerald-500', text: 'text-emerald-400' },
  MISSED: { label: 'Missed', color: '#f43f5e', bg: 'bg-rose-500', text: 'text-rose-400' },
  REMINDERS: { label: 'Reminders', color: '#f59e0b', bg: 'bg-amber-500', text: 'text-amber-400' }
};

export default function DepartmentCallWorkloadCard({ businessId, batchId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('to_call'); // 'to_call' | 'done_today'
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Drill-down modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalParams, setModalParams] = useState({ campaign: 'OPEN_SEMINAR', type: 'due', staffId: null, staffName: null });
  const [modalList, setModalList] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalSearch, setModalSearch] = useState('');

  const timerRef = useRef(null);

  const fetchWorkload = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      setError(null);
      const res = await axios.get('/admin/manager/call-workload', {
        params: {
          businessId: businessId || 'ALL',
          batchId: batchId || 'ALL',
          ...(isManual ? { refresh: '1' } : {})
        }
      });
      setData(res.data);
    } catch (err) {
      console.error('Failed to load call workload:', err);
      setError('Couldn’t load call workload');
    } finally {
      setLoading(false);
      if (isManual) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchWorkload();

    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchWorkload();
      }
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(timerRef.current);
  }, [businessId, batchId]);

  // Open drill-down modal and fetch details
  const openDrillDown = async ({ campaign = 'OPEN_SEMINAR', type = 'due', staffId = null, staffName = null }) => {
    setModalParams({ campaign, type, staffId, staffName });
    setModalOpen(true);
    setModalLoading(true);
    setModalSearch('');
    try {
      const res = await axios.get('/admin/manager/call-workload/list', {
        params: {
          businessId: businessId || 'ALL',
          batchId: batchId || 'ALL',
          campaign,
          type,
          ...(staffId ? { staffId } : {})
        }
      });
      setModalList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load drill-down list:', err);
      setModalList([]);
    } finally {
      setModalLoading(false);
    }
  };

  const changeModalCampaign = async (newCampaign) => {
    openDrillDown({ ...modalParams, campaign: newCampaign });
  };

  // Filtered drill-down items by search term
  const filteredModalList = useMemo(() => {
    if (!modalSearch.trim()) return modalList;
    const q = modalSearch.toLowerCase().trim();
    return modalList.filter(item => 
      (item.name && item.name.toLowerCase().includes(q)) ||
      (item.phone && item.phone.includes(q)) ||
      (item.coordinator && item.coordinator.toLowerCase().includes(q)) ||
      (item.status && item.status.toLowerCase().includes(q))
    );
  }, [modalList, modalSearch]);

  const totals = data?.totals || { due: 0, doneToday: 0, overdue: 0, missedDue: 0, remindersDue: 0 };
  const coordinators = data?.coordinators || [];

  return (
    <>
      <div className="bg-white/70 dark:bg-white/[0.03] backdrop-blur-2xl p-5 rounded-[2rem] border border-gray-200 dark:border-white/10 shadow-xl flex flex-col h-[380px] relative overflow-hidden text-left">
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* 1. Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-white/5 relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <PhoneCall size={14} />
            </div>
            <div>
              <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                Department Call Workload
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center p-0.5 rounded-lg bg-black/30 border border-white/10">
              <button
                type="button"
                onClick={() => setViewMode('to_call')}
                className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${
                  viewMode === 'to_call' 
                    ? 'bg-purple-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                To Call
              </button>
              <button
                type="button"
                onClick={() => setViewMode('done_today')}
                className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${
                  viewMode === 'done_today' 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Done Today
              </button>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => fetchWorkload(true)}
              disabled={isRefreshing}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
              title="Refresh workload now"
            >
              <RefreshCw size={12} className={isRefreshing ? 'animate-spin text-purple-400' : ''} />
            </button>
          </div>
        </div>

        {/* 2. Content */}
        {loading && !data ? (
          <div className="flex-1 flex flex-col justify-center gap-3 p-2 animate-pulse">
            <div className="grid grid-cols-5 gap-1.5">
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className="h-11 rounded-xl bg-white/5 border border-white/5" />
              ))}
            </div>
            <div className="space-y-2 mt-2">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="h-10 rounded-xl bg-white/5 border border-white/5" />
              ))}
            </div>
          </div>
        ) : error && !data ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 p-6 text-center">
            <AlertCircle size={24} className="text-rose-400" />
            <p className="text-xs font-bold text-slate-300">{error}</p>
            <button
              type="button"
              onClick={() => fetchWorkload(true)}
              className="mt-1 px-3 py-1 text-xs font-bold rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* 3. KPI 5-Chip Row */}
            <div className="grid grid-cols-5 gap-1.5 py-2.5 border-b border-gray-200 dark:border-white/5">
              <button
                type="button"
                onClick={() => openDrillDown({ campaign: 'OPEN_SEMINAR', type: 'due' })}
                className="bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-purple-500/40 rounded-xl px-1.5 py-1 text-center transition-all group"
                title="Total calls pending across all campaigns"
              >
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block group-hover:text-purple-300 transition-colors">
                  To Call
                </span>
                <span className="text-sm font-black text-white font-mono">{totals.due.toLocaleString()}</span>
              </button>

              <button
                type="button"
                onClick={() => openDrillDown({ campaign: 'OPEN_SEMINAR', type: 'done' })}
                className="bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-emerald-500/40 rounded-xl px-1.5 py-1 text-center transition-all group"
                title="Calls successfully actioned today"
              >
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block group-hover:text-emerald-300 transition-colors">
                  Done Today
                </span>
                <span className="text-sm font-black text-emerald-400 font-mono">{totals.doneToday.toLocaleString()}</span>
              </button>

              <button
                type="button"
                onClick={() => openDrillDown({ campaign: 'OPEN_SEMINAR', type: 'overdue' })}
                className="bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-rose-500/40 rounded-xl px-1.5 py-1 text-center transition-all group"
                title="Overdue calls exceeding time threshold"
              >
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block group-hover:text-rose-300 transition-colors">
                  Overdue
                </span>
                <span className={`text-sm font-black font-mono ${totals.overdue > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                  {totals.overdue.toLocaleString()}
                </span>
              </button>

              <button
                type="button"
                onClick={() => openDrillDown({ campaign: 'MISSED', type: 'due' })}
                className="bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-amber-500/40 rounded-xl px-1.5 py-1 text-center transition-all group"
                title="Unresolved missed incoming calls"
              >
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block group-hover:text-amber-300 transition-colors">
                  Missed
                </span>
                <span className={`text-sm font-black font-mono ${totals.missedDue > 0 ? 'text-rose-300' : 'text-slate-400'}`}>
                  {totals.missedDue.toLocaleString()}
                </span>
              </button>

              <button
                type="button"
                onClick={() => openDrillDown({ campaign: 'REMINDERS', type: 'due' })}
                className="bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-cyan-500/40 rounded-xl px-1.5 py-1 text-center transition-all group"
                title="Scheduled coordinator call reminders for today"
              >
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block group-hover:text-cyan-300 transition-colors">
                  Reminders
                </span>
                <span className={`text-sm font-black font-mono ${totals.remindersDue > 0 ? 'text-amber-300' : 'text-slate-400'}`}>
                  {totals.remindersDue.toLocaleString()}
                </span>
              </button>
            </div>

            {/* 4. Legend */}
            <div className="flex items-center justify-between px-1 py-1 text-[9px] font-bold text-slate-400 shrink-0">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CAMPAIGN_META.OPEN_SEMINAR.color }}></span>
                Open Sem
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CAMPAIGN_META.NEW_INQ.color }}></span>
                New Inq
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CAMPAIGN_META.PAID.color }}></span>
                Paid
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CAMPAIGN_META.MISSED.color }}></span>
                Missed
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CAMPAIGN_META.REMINDERS.color }}></span>
                Reminders
              </span>
            </div>

            {/* 5. Coordinator Horizontal Stacked Bars */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1 mt-1">
              {coordinators.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-xs font-bold text-slate-500 py-6">
                  No active coordinators assigned in this scope.
                </div>
              ) : (
                coordinators.map(coord => {
                  const isToCall = viewMode === 'to_call';
                  const total = isToCall ? coord.totalDue : coord.doneToday;

                  // Compute segment values
                  const segs = isToCall ? [
                    { key: 'OPEN_SEMINAR', val: coord.due.OPEN_SEMINAR, ...CAMPAIGN_META.OPEN_SEMINAR },
                    { key: 'NEW_INQ', val: coord.due.NEW_INQ, ...CAMPAIGN_META.NEW_INQ },
                    { key: 'PAID', val: coord.due.PAID, ...CAMPAIGN_META.PAID },
                    { key: 'MISSED', val: coord.due.MISSED, ...CAMPAIGN_META.MISSED },
                    { key: 'REMINDERS', val: coord.due.REMINDERS, ...CAMPAIGN_META.REMINDERS }
                  ] : [
                    { key: 'OPEN_SEMINAR', val: coord.doneByCampaign.OPEN_SEMINAR, ...CAMPAIGN_META.OPEN_SEMINAR },
                    { key: 'NEW_INQ', val: coord.doneByCampaign.NEW_INQ, ...CAMPAIGN_META.NEW_INQ },
                    { key: 'PAID', val: coord.doneByCampaign.PAID, ...CAMPAIGN_META.PAID },
                    { key: 'MISSED', val: coord.doneByCampaign.MISSED, ...CAMPAIGN_META.MISSED },
                    { key: 'REMINDERS', val: coord.doneByCampaign.REMINDERS, ...CAMPAIGN_META.REMINDERS }
                  ];

                  const activeSegs = segs.filter(s => s.val > 0);

                  return (
                    <div 
                      key={coord.staffId} 
                      className="bg-white/[0.02] hover:bg-white/[0.05] p-2 rounded-xl border border-white/5 transition-all group"
                    >
                      {/* Name & Metric Header */}
                      <div className="flex items-center justify-between text-xs font-bold mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {/* Coordinator Avatar */}
                          {coord.image ? (
                            <img
                              src={coord.image}
                              alt={coord.name}
                              className="w-5 h-5 rounded-full object-cover shrink-0 border border-white/10"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center text-[9px] font-black shrink-0">
                              {coord.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span className="font-bold text-white text-[11px] truncate group-hover:text-purple-300 transition-colors" title={coord.name}>
                            {coord.name}
                          </span>
                        </div>

                        {/* Top-Right Badge */}
                        <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px]">
                          {isToCall ? (
                            <>
                              <span className="text-white font-black">{coord.totalDue} left</span>
                              {coord.overdue > 0 && (
                                <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-1 rounded" title={`${coord.overdue} overdue`}>
                                  {coord.overdue} od
                                </span>
                              )}
                              <span className="text-purple-300 font-bold bg-purple-500/10 border border-purple-500/25 px-1.5 rounded text-[10px]">
                                {coord.donePct}% done
                              </span>
                            </>
                          ) : (
                            <span className="text-emerald-400 font-black">
                              {coord.doneToday} calls done
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Stacked Bar */}
                      <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden flex shadow-inner">
                        {total === 0 ? (
                          <div className="h-full w-full bg-emerald-500/20 text-[8px] flex items-center justify-center text-emerald-400 font-bold">
                            {isToCall ? 'All Caught Up' : 'No calls yet'}
                          </div>
                        ) : (
                          activeSegs.map((s, idx) => {
                            const pct = Math.round((s.val / total) * 100);
                            return (
                              <button
                                key={s.key}
                                type="button"
                                onClick={() => openDrillDown({
                                  campaign: s.key,
                                  type: isToCall ? 'due' : 'done',
                                  staffId: coord.staffId,
                                  staffName: coord.name
                                })}
                                style={{ width: `${(s.val / total) * 100}%`, backgroundColor: s.color }}
                                className="h-full transition-all hover:opacity-80 relative group/seg"
                                title={`${coord.name} · ${s.label}: ${s.val} (Click to inspect)`}
                              />
                            );
                          })
                        )}
                      </div>

                      {/* Breakdown Text */}
                      <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold mt-1">
                        <div className="flex items-center gap-2">
                          {activeSegs.map(s => (
                            <span key={s.key} style={{ color: s.color }}>
                              {s.label[0]}: {s.val}
                            </span>
                          ))}
                        </div>
                        <span className="text-slate-500 font-medium">
                          {isToCall ? `${coord.doneToday} called today` : `${coord.totalDue} remaining`}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      {/* 🔹 Drill-Down Modal */}
      {modalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in"
          onClick={() => setModalOpen(false)}
        >
          <div 
            className="bg-[#0b1220] border border-cyan-500/30 rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl relative text-left overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-widest text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/30">
                    {modalParams.type === 'overdue' ? 'Overdue Calls' : modalParams.type === 'done' ? 'Done Today' : 'Pending Calls'}
                  </span>
                  {modalParams.staffName && (
                    <span className="text-xs font-bold text-slate-300">
                      Coordinator: <strong className="text-white">{modalParams.staffName}</strong>
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-black text-white mt-1">
                  {CAMPAIGN_META[modalParams.campaign]?.label || modalParams.campaign} Workload Detail
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white flex items-center justify-center transition-colors border border-white/10"
              >
                <X size={16} />
              </button>
            </div>

            {/* Campaign Switcher inside Modal */}
            <div className="px-5 pt-3 pb-2 flex flex-wrap items-center justify-between gap-3 border-b border-white/5 bg-black/20">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {Object.keys(CAMPAIGN_META).map(campKey => {
                  const active = modalParams.campaign === campKey;
                  const meta = CAMPAIGN_META[campKey];
                  return (
                    <button
                      key={campKey}
                      type="button"
                      onClick={() => changeModalCampaign(campKey)}
                      className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                        active 
                          ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' 
                          : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/5'
                      }`}
                    >
                      {meta.label}
                    </button>
                  );
                })}
              </div>

              {/* Search Bar */}
              <div className="relative min-w-[220px]">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by name, phone..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-full bg-[#030712] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {/* Modal Body: Table */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
              {modalLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                  <RefreshCw size={24} className="animate-spin text-cyan-400" />
                  <p className="text-xs font-bold">Fetching records...</p>
                </div>
              ) : filteredModalList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500 text-center">
                  <CheckCircle2 size={32} className="text-slate-600 mb-2" />
                  <p className="text-sm font-bold text-slate-300">No records found</p>
                  <p className="text-xs text-slate-500 mt-0.5">All calls in this filter have been completed or none exist.</p>
                </div>
              ) : (
                <div className="border border-white/10 rounded-2xl overflow-hidden bg-black/30">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/[0.04] text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-white/10">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Student Name</th>
                        <th className="py-2.5 px-3">Phone</th>
                        <th className="py-2.5 px-3">Coordinator</th>
                        <th className="py-2.5 px-3 text-center">Round</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredModalList.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-white/[0.03] transition-colors">
                          <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-bold text-white">
                            {item.name}
                            {item.isOverdue && (
                              <span className="ml-1.5 px-1 py-0.2 rounded text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                Overdue
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-cyan-300 font-bold">{item.phone}</td>
                          <td className="py-2.5 px-3 text-slate-300">{item.coordinator || '—'}</td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-300">R{item.round || 1}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 text-slate-300 border border-white/10 capitalize">
                              {item.status || 'pending'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 font-mono text-[10px]">
                            {item.date ? new Date(item.date).toLocaleDateString() : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {item.phone && (
                              <a
                                href={`https://wa.me/${item.phone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30 font-bold text-[10px] transition-all"
                              >
                                Chat <ExternalLink size={10} />
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-white/10 bg-white/[0.02] flex items-center justify-between text-xs text-slate-400 px-5">
              <span>Showing {filteredModalList.length} of {modalList.length} records</span>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
