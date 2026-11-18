import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../../../api/axios';
import { PhoneCall, UserPlus, ArrowRight, Clock, Zap, RefreshCw, Target, Trophy, Layers, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';

// 🔥 Manager System Overview: Open Seminar + New Inquiries campaign summary tiles 🔥
// Self-contained: fetches its own data from /after-seminar-crm/stats/campaign-summary
// and refreshes every 60 seconds (the backend caches for 60s, so polling is cheap).

const REFRESH_MS = 60 * 1000;

const fmt = (n) => (Number(n) || 0).toLocaleString('en-US');
const pct = (n) => `${(Number(n) || 0).toFixed(1)}%`;

const THEMES = {
    violet: {
        card: 'from-[#1e1b4b]/90 to-[#141a3a]/90 border-violet-500/20 hover:border-violet-400/40',
        icon: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
        sub: 'text-violet-300/80',
        bar: 'bg-violet-400',
        link: 'text-violet-300 hover:text-violet-200'
    },
    teal: {
        card: 'from-[#06302f]/90 to-[#0b1f2a]/90 border-teal-500/20 hover:border-teal-400/40',
        icon: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
        sub: 'text-teal-300/80',
        bar: 'bg-teal-400',
        link: 'text-teal-300 hover:text-teal-200'
    }
};

const StatBox = ({ label, value, color, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className="bg-black/25 hover:bg-black/40 border border-white/5 hover:border-white/15 rounded-xl py-2.5 px-2 text-center transition-all"
    >
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
        <p className={`text-xl font-black mt-0.5 ${color}`}>{fmt(value)}</p>
    </button>
);

const CampaignTile = ({ theme, icon: Icon, title, subtitle, data, path, footer, extraLine, navigate }) => {
    const t = THEMES[theme];
    const go = (filter) => navigate(filter ? `${path}?filter=${filter}` : path);

    if (!data) {
        return (
            <div className={`rounded-[1.75rem] border bg-gradient-to-br p-5 ${t.card} flex items-center justify-center min-h-[290px]`}>
                <p className="text-xs font-bold text-slate-400">{title}: data not available</p>
            </div>
        );
    }

    return (
        <div className={`rounded-[1.75rem] border bg-gradient-to-br p-5 transition-all ${t.card}`}>
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${t.icon}`}>
                        <Icon size={20} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-wide text-white">{title}</h3>
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${t.sub}`}>{subtitle}</p>
                    </div>
                </div>
                <button type="button" onClick={() => go()} className={`text-[11px] font-bold flex items-center gap-1 ${t.link}`}>
                    Open <ArrowRight size={12} />
                </button>
            </div>

            {/* Main number */}
            <div className="flex items-baseline gap-3 mt-4">
                <span className="text-4xl font-black text-white leading-none">{pct(data.conversionRate)}</span>
                <span className="text-[11px] font-bold text-slate-300">
                    conversion · {fmt(data.enrolled)} enrolled of {fmt(data.assigned)}
                </span>
            </div>

            {/* 🎯 Group target */}
            {data.target && (
                <div className="flex items-center gap-2 mt-2 text-[11px] font-bold">
                    <span className="flex items-center gap-1 text-cyan-300"><Target size={12} /> Target {data.target.group}%</span>
                    {data.target.achieved
                        ? <span className="text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded-md">Achieved</span>
                        : <span className="text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded-md">Need {fmt(data.target.neededForGroup)} more</span>}
                    <span className="text-slate-500">· Single {data.target.individual}%</span>
                </div>
            )}

            {/* Contacted progress */}
            <div className="h-1.5 rounded-full bg-black/30 overflow-hidden mt-3">
                <div className={`h-full rounded-full ${t.bar}`} style={{ width: `${Math.min(Number(data.contactedRate) || 0, 100)}%` }} />
            </div>
            <p className="text-[11px] font-semibold text-slate-400 mt-1.5 mb-3">
                Contacted {pct(data.contactedRate)} · {extraLine}
            </p>

            {/* Status boxes */}
            <div className="grid grid-cols-4 gap-2">
                <StatBox label="Pending" value={data.pending} color="text-amber-400" onClick={() => go('PENDING')} />
                <StatBox label="Answered" value={data.answered} color="text-emerald-400" onClick={() => go('ANSWERED')} />
                <StatBox label="No answer" value={data.noAnswer} color="text-slate-200" onClick={() => go('NO_ANSWER')} />
                <StatBox label="Reject" value={data.reject} color="text-rose-400" onClick={() => go('REJECT')} />
            </div>

            {/* 🏆 Top contributor */}
            {data.topContributor && (
                <div className="flex items-center gap-2 mt-3 bg-amber-500/10 border border-amber-400/20 rounded-xl px-3 py-2">
                    <Trophy size={14} className="text-amber-300 shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-300">Top</span>
                    <span className="text-xs font-black text-white truncate">{data.topContributor.name}</span>
                    <span className="text-[11px] font-bold text-slate-300 ml-auto shrink-0">
                        {data.topContributor.rate}% · {fmt(data.topContributor.enrolled)} enrolled
                    </span>
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 mt-3">
                {footer}
            </div>
        </div>
    );
};


// 🔥 MULTI-BATCH: students who paid for an EXTRA batch and still need a coordinator 🔥
const UnassignedExtraBatches = ({ businessId, batchId }) => {
    const [rows, setRows] = useState([]);
    const [open, setOpen] = useState(false);
    const [coordinators, setCoordinators] = useState([]);
    const [savingId, setSavingId] = useState(null);

    const load = async () => {
        try {
            const res = await axios.get('/after-seminar-crm/lead-batches/unassigned', { params: { businessId, batchId: batchId || 'ALL' } });
            setRows(res.data?.rows || []);
        } catch (e) {
            console.error('Unassigned extra batches load failed:', e);
        }
    };

    useEffect(() => {
        load();
        const t = setInterval(() => { if (document.visibilityState === 'visible') load(); }, REFRESH_MS);
        return () => clearInterval(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [businessId, batchId]);

    useEffect(() => {
        if (open && coordinators.length === 0) {
            axios.get('/after-seminar-crm/coordinators').then(r => setCoordinators(Array.isArray(r.data) ? r.data : [])).catch(() => {});
        }
    }, [open, coordinators.length]);

    if (rows.length === 0) return null;

    const assign = async (rowId, coordinatorId) => {
        if (!coordinatorId) return;
        setSavingId(rowId);
        try {
            await axios.patch(`/after-seminar-crm/lead-batches/${rowId}`, { assignedTo: coordinatorId });
            toast.success('Coordinator assigned');
            setRows(prev => prev.filter(r => r.id !== rowId));
        } catch (e) {
            toast.error(e.response?.data?.error || 'Failed to assign');
        } finally {
            setSavingId(null);
        }
    };

    return (
        <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/5">
            <button type="button" onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left">
                <span className="flex items-center gap-2 text-xs font-bold text-amber-200">
                    <Layers size={14} /> {rows.length} student{rows.length > 1 ? 's' : ''} paid for an extra batch and need a coordinator
                </span>
                {open ? <ChevronUp size={14} className="text-amber-300" /> : <ChevronDown size={14} className="text-amber-300" />}
            </button>
            {open && (
                <div className="px-4 pb-4 flex flex-col gap-2 max-h-80 overflow-y-auto">
                    {rows.map(r => (
                        <div key={r.id} className="flex flex-col md:flex-row md:items-center gap-2 bg-black/25 border border-white/5 rounded-xl px-3 py-2">
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-white truncate">{r.name || r.phone} <span className="text-slate-400 font-semibold">· {r.phone}</span></p>
                                <p className="text-[11px] text-slate-400">
                                    Extra: <span className="text-amber-300 font-bold">{r.batchName}</span> · Main chat: {r.mainBatchName || '—'} ({r.mainCoordinatorName || 'Unassigned'})
                                </p>
                            </div>
                            <select
                                defaultValue=""
                                disabled={savingId === r.id}
                                onChange={(e) => assign(r.id, e.target.value)}
                                className="bg-[#0f172a] border border-slate-700 text-slate-200 text-[11px] rounded-lg px-2 py-1.5 outline-none md:w-56"
                            >
                                <option value="">Assign coordinator...</option>
                                {r.mainCoordinatorId && <option value={r.mainCoordinatorId}>{r.mainCoordinatorName} (same as main)</option>}
                                {coordinators.filter(c => c.id !== r.mainCoordinatorId).map(c => (
                                    <option key={c.id} value={c.id}>{`${c.firstName || ''} ${c.lastName || ''}`.trim()}</option>
                                ))}
                            </select>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default function CampaignSummaryTiles({ businessId, batchId }) {
    const navigate = useNavigate();
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);
    const timerRef = useRef(null);

    const fetchSummary = async (force = false) => {
        if (!businessId) return;
        try {
            const res = await axios.get('/after-seminar-crm/stats/campaign-summary', {
                params: { businessId, batchId: batchId || 'ALL', ...(force ? { refresh: 1 } : {}) }
            });
            setSummary(res.data);
            setLastUpdated(new Date());
        } catch (e) {
            console.error('Campaign summary load failed:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        fetchSummary();
        clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            // Don't poll while the tab is hidden
            if (document.visibilityState === 'visible') fetchSummary();
        }, REFRESH_MS);
        return () => clearInterval(timerRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [businessId, batchId]);

    if (!businessId) return null;

    if (loading && !summary) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {[0, 1].map(i => (
                    <div key={i} className="rounded-[1.75rem] border border-white/5 bg-white/[0.03] min-h-[290px] animate-pulse" />
                ))}
            </div>
        );
    }

    const os = summary?.openSeminar;
    const ni = summary?.newInquiries;

    return (
        <div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <CampaignTile
                    theme="violet"
                    icon={PhoneCall}
                    title="Open Seminar Campaign"
                    subtitle="Free seminar → enrolled"
                    data={os}
                    path="/workspace/campaign/open-seminar"
                    navigate={navigate}
                    extraLine={<>Round 1 → Round 2: {fmt(os?.movedToR2)} moved</>}
                    footer={<>
                        <Clock size={12} /> Today +{fmt(os?.todayNew)} new · Direct paid {fmt(os?.directPaid)} · Delayed:{' '}
                        <span className="text-rose-400 font-bold">{fmt(os?.delayed)}</span>
                    </>}
                />
                <CampaignTile
                    theme="teal"
                    icon={UserPlus}
                    title="New Inquiries Campaign"
                    subtitle="Fresh leads → enrolled"
                    data={ni}
                    path="/workspace/campaign/new-inquiries"
                    navigate={navigate}
                    extraLine={<>Today +{fmt(ni?.todayNew)} new · <span className="text-amber-400">{fmt(ni?.unassigned)} unassigned</span></>}
                    footer={<>
                        <Zap size={12} /> Direct paid {fmt(ni?.directPaid)} · Delayed:{' '}
                        <span className="text-rose-400 font-bold">{fmt(ni?.delayed)}</span>
                    </>}
                />
            </div>
            <UnassignedExtraBatches businessId={businessId} batchId={batchId} />
            <div className="flex justify-end items-center gap-2 mt-1.5 text-[10px] font-semibold text-slate-500">
                {lastUpdated && <span>Updated {lastUpdated.toLocaleTimeString()}</span>}
                <button type="button" onClick={() => fetchSummary(true)} className="hover:text-slate-300 flex items-center gap-1" title="Refresh now">
                    <RefreshCw size={11} /> Refresh
                </button>
            </div>
        </div>
    );
}
