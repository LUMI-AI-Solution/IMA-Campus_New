import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../../../api/axios';
import { 
  FaWhatsapp, 
  FaCircle, 
  FaExternalLinkAlt, 
  FaInbox, 
  FaArrowRight, 
  FaClock, 
  FaExclamationTriangle, 
  FaCheckCircle 
} from 'react-icons/fa';
import { RefreshCw, AlertCircle } from 'lucide-react';

const REFRESH_MS = 60000; // 60 seconds

export default function CrmSummaryTiles({ businessId, batchId, businessIds, mode = 'manager' }) {
  const isCoordinator = mode === 'coordinator';
  const navigate = useNavigate();

  const [chatSummary, setChatSummary] = useState({
    afterSeminar: { totalUnread: 0, newUnread: 0, newTotal: 0, expiringSoon: 0, expired: 0, active: 0 },
    freeSeminar: { totalUnread: 0, newUnread: 0, newTotal: 0, expiringSoon: 0, expired: 0, active: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const timerRef = useRef(null);

  const fetchSummary = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    setError(null);
    try {
      const params = {
        businessId: businessId || undefined,
        batchId: batchId || 'ALL',
        businessIds: businessIds || undefined,
        ...(isCoordinator ? { mine: 1 } : {})
      };

      const res = await axios.get('/coordinator-crm/realtime-chat-summary', { params });
      if (res.data?.success) {
        setChatSummary({
          afterSeminar: res.data.afterSeminar || { totalUnread: 0, newUnread: 0, newTotal: 0, expiringSoon: 0, expired: 0, active: 0 },
          freeSeminar: res.data.freeSeminar || { totalUnread: 0, newUnread: 0, newTotal: 0, expiringSoon: 0, expired: 0, active: 0 }
        });
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Error fetching CRM realtime chat summary:', err);
      if (!isBackground) {
        setError('Failed to load CRM chat stats');
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary(false);

    // Refresh every 60 seconds, but skip if document tab is hidden
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (!document.hidden) {
        fetchSummary(true);
      }
    }, REFRESH_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, batchId, businessIds, mode]);

  if (error && loading) {
    return (
      <div className="rounded-[2rem] border border-rose-500/30 bg-rose-500/10 p-6 text-center text-rose-300 backdrop-blur-md">
        <div className="flex items-center justify-center gap-2 mb-2 font-bold text-sm">
          <AlertCircle size={18} /> {error}
        </div>
        <button
          type="button"
          onClick={() => fetchSummary(false)}
          className="px-4 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-xs font-black uppercase tracking-wider text-white transition-all cursor-pointer inline-flex items-center gap-1.5"
        >
          <RefreshCw size={12} /> Retry
        </button>
      </div>
    );
  }

  const renderSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-pulse">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="rounded-[2rem] p-6 bg-slate-900/60 border border-white/10 flex flex-col justify-between h-[210px]"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/5" />
              <div className="space-y-1.5">
                <div className="w-32 h-4 bg-white/10 rounded" />
                <div className="w-24 h-2.5 bg-white/5 rounded" />
              </div>
            </div>
            <div className="w-16 h-6 bg-white/5 rounded-full" />
          </div>
          <div className="w-36 h-10 bg-white/10 rounded" />
          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/5">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="h-14 bg-white/5 rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  if (loading && !chatSummary.afterSeminar.totalUnread && !chatSummary.freeSeminar.totalUnread) {
    return renderSkeleton();
  }

  const asData = chatSummary.afterSeminar;
  const fsData = chatSummary.freeSeminar;

  const asNewBadge = isCoordinator ? (asData.newTotal || asData.newUnread || 0) : asData.newUnread;
  const fsNewBadge = isCoordinator ? (fsData.newTotal || fsData.newUnread || 0) : fsData.newUnread;

  return (
    <div>
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
                  {loading ? '...' : Number(asData.totalUnread || 0).toLocaleString()}
                </span>
                <span className="text-xs font-black text-purple-200/80 uppercase tracking-wider ml-1">
                  Unread Chats
                </span>
                {asNewBadge > 0 && (
                  <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm shadow-cyan-500/10 ml-2 animate-pulse">
                    <FaInbox size={10} /> {asNewBadge} New
                  </span>
                )}
              </div>
              <span className="text-[11px] font-bold text-purple-300/80 group-hover:text-white flex items-center gap-1 transition-colors">
                Open CRM <FaArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </div>

            {/* Status Breakdown Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/5">
              {/* Box 1: New (Unassigned) for Manager / Assigned to Me (today) for Coordinator */}
              <div className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition-colors ${
                (isCoordinator ? (asData.newTotal || 0) > 0 : (asData.newUnread || 0) > 0)
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 shadow-sm shadow-cyan-500/10'
                  : 'bg-white/[0.02] border-white/5 text-slate-400'
              }`}>
                <span className="text-[9px] font-black uppercase tracking-wider flex items-center gap-1 mb-0.5">
                  <FaInbox size={9} className="text-cyan-400" /> {isCoordinator ? 'ASSIGNED TO ME (today)' : 'New (Unassigned)'}
                </span>
                <span className="text-base font-black text-cyan-300">
                  {loading ? '...' : (isCoordinator ? (asData.newTotal || 0) : (asData.newUnread || 0))}
                </span>
                {(asData.newTotal || 0) > 0 && (
                  <span className="text-[8px] font-bold text-slate-400 opacity-70">
                    {isCoordinator ? `Unread: ${asData.newUnread || 0}` : `Total: ${asData.newTotal}`}
                  </span>
                )}
              </div>

              {/* Expiring Soon (<4h) */}
              <div className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition-colors ${
                (asData.expiringSoon || 0) > 0
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-300 shadow-sm shadow-amber-500/10 animate-pulse'
                  : 'bg-white/[0.02] border-white/5 text-slate-400'
              }`}>
                <span className="text-[9px] font-black uppercase tracking-wider flex items-center gap-1 mb-0.5">
                  <FaClock size={9} className="text-amber-400" /> Expiring &lt;4h
                </span>
                <span className="text-base font-black text-amber-300">
                  {loading ? '...' : (asData.expiringSoon || 0)}
                </span>
              </div>

              {/* Expired (>=24h) */}
              <div className="p-2.5 rounded-xl border bg-white/[0.02] border-white/5 flex flex-col items-center justify-center text-center">
                <span className="text-[9px] font-black uppercase tracking-wider text-rose-300/80 flex items-center gap-1 mb-0.5">
                  <FaExclamationTriangle size={9} className="text-rose-400" /> Expired &ge;24h
                </span>
                <span className="text-base font-black text-rose-300">
                  {loading ? '...' : (asData.expired || 0)}
                </span>
              </div>

              {/* Active (<20h) */}
              <div className="p-2.5 rounded-xl border bg-white/[0.02] border-white/5 flex flex-col items-center justify-center text-center">
                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-300/80 flex items-center gap-1 mb-0.5">
                  <FaCheckCircle size={9} className="text-emerald-400" /> Active &lt;20h
                </span>
                <span className="text-base font-black text-emerald-300">
                  {loading ? '...' : (asData.active || 0)}
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
                  {loading ? '...' : Number(fsData.totalUnread || 0).toLocaleString()}
                </span>
                <span className="text-xs font-black text-emerald-200/80 uppercase tracking-wider ml-1">
                  Unread Chats
                </span>
                {fsNewBadge > 0 && (
                  <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm shadow-cyan-500/10 ml-2 animate-pulse">
                    <FaInbox size={10} /> {fsNewBadge} New
                  </span>
                )}
              </div>
              <span className="text-[11px] font-bold text-emerald-300/80 group-hover:text-white flex items-center gap-1 transition-colors">
                Open CRM <FaArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </div>

            {/* Status Breakdown Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/5">
              {/* Box 1: New (Unassigned) for Manager / Assigned to Me (today) for Coordinator */}
              <div className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition-colors ${
                (isCoordinator ? (fsData.newTotal || 0) > 0 : (fsData.newUnread || 0) > 0)
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 shadow-sm shadow-cyan-500/10'
                  : 'bg-white/[0.02] border-white/5 text-slate-400'
              }`}>
                <span className="text-[9px] font-black uppercase tracking-wider flex items-center gap-1 mb-0.5">
                  <FaInbox size={9} className="text-cyan-400" /> {isCoordinator ? 'ASSIGNED TO ME (today)' : 'New (Unassigned)'}
                </span>
                <span className="text-base font-black text-cyan-300">
                  {loading ? '...' : (isCoordinator ? (fsData.newTotal || 0) : (fsData.newUnread || 0))}
                </span>
                {(fsData.newTotal || 0) > 0 && (
                  <span className="text-[8px] font-bold text-slate-400 opacity-70">
                    {isCoordinator ? `Unread: ${fsData.newUnread || 0}` : `Total: ${fsData.newTotal}`}
                  </span>
                )}
              </div>

              {/* Expiring Soon (<4h) */}
              <div className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition-colors ${
                (fsData.expiringSoon || 0) > 0
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-300 shadow-sm shadow-amber-500/10 animate-pulse'
                  : 'bg-white/[0.02] border-white/5 text-slate-400'
              }`}>
                <span className="text-[9px] font-black uppercase tracking-wider flex items-center gap-1 mb-0.5">
                  <FaClock size={9} className="text-amber-400" /> Expiring &lt;4h
                </span>
                <span className="text-base font-black text-amber-300">
                  {loading ? '...' : (fsData.expiringSoon || 0)}
                </span>
              </div>

              {/* Expired (>=24h) */}
              <div className="p-2.5 rounded-xl border bg-white/[0.02] border-white/5 flex flex-col items-center justify-center text-center">
                <span className="text-[9px] font-black uppercase tracking-wider text-rose-300/80 flex items-center gap-1 mb-0.5">
                  <FaExclamationTriangle size={9} className="text-rose-400" /> Expired &ge;24h
                </span>
                <span className="text-base font-black text-rose-300">
                  {loading ? '...' : (fsData.expired || 0)}
                </span>
              </div>

              {/* Active (<20h) */}
              <div className="p-2.5 rounded-xl border bg-white/[0.02] border-white/5 flex flex-col items-center justify-center text-center">
                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-300/80 flex items-center gap-1 mb-0.5">
                  <FaCheckCircle size={9} className="text-emerald-400" /> Active &lt;20h
                </span>
                <span className="text-base font-black text-emerald-300">
                  {loading ? '...' : (fsData.active || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

      <div className="flex justify-end items-center gap-2 mt-1.5 text-[10px] font-semibold text-slate-500">
        {lastUpdated && <span>Updated {lastUpdated.toLocaleTimeString()}</span>}
        <button
          type="button"
          onClick={() => fetchSummary(false)}
          className="hover:text-slate-300 flex items-center gap-1 cursor-pointer"
          title="Refresh now"
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>
    </div>
  );
}
