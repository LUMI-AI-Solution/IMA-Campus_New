import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../../../api/axios';
import { PhoneCall, UserPlus, ArrowRight, Clock, Zap, RefreshCw, Target, Trophy, Layers, ChevronDown, ChevronUp, Crown, Users, TrendingUp } from 'lucide-react';
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



// =====================================================================
// 🔥 COORDINATOR MODE: the logged-in coordinator's own numbers + team target + leaderboard 🔥
// =====================================================================
const imgSrc = (image) => {
    if (!image || typeof image !== 'string' || image === 'null' || image === 'undefined' || image.trim().length < 5) return null;
    return image.startsWith('http') ? image : `${import.meta.env.VITE_API_URL || ''}${image}`;
};
const initialsOf = (name) => {
    const p = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (p.length >= 2) return (p[0][0] + p[1][0]).toUpperCase();
    return (p[0] || 'CO').slice(0, 2).toUpperCase();
};
const Avatar = ({ image, name, size = 36, ring = '' }) => {
    const [failed, setFailed] = useState(false);
    const src = imgSrc(image);
    const style = { width: size, height: size };
    if (src && !failed) {
        return <img src={src} alt={name || ''} style={style} onError={() => setFailed(true)} className={`rounded-full object-cover shrink-0 ${ring}`} />;
    }
    return (
        <div style={style} className={`rounded-full shrink-0 flex items-center justify-center bg-gradient-to-br from-fuchsia-600 to-indigo-600 text-white font-black ${ring}`}>
            <span style={{ fontSize: Math.max(10, Math.round(size / 2.8)) }}>{initialsOf(name)}</span>
        </div>
    );
};

const ProgressBar = ({ value, color }) => (
    <div className="h-1.5 rounded-full bg-black/30 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, Number(value) || 0))}%` }} />
    </div>
);

const Leaderboard = ({ data, theme }) => {
    const t = THEMES[theme];
    const board = data.leaderboard || [];
    const me = data.me;
    const leader = board[0];
    if (!leader) {
        return <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-[11px] text-slate-400">No conversions yet — be the first on the board!</div>;
    }
    const meInTop = me && me.rank && board.some(b => String(b.staffId) === String(me.staffId));
    return (
        <div className="mt-3 rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/10 to-transparent p-3">
            {/* Leader */}
            <div className="flex items-center gap-3">
                <div className="relative">
                    <Avatar image={leader.image} name={leader.name} size={52} ring="ring-2 ring-amber-300 shadow-[0_0_18px_rgba(251,191,36,0.45)]" />
                    <Crown size={18} className="absolute -top-3 left-1/2 -translate-x-1/2 text-amber-300 drop-shadow" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-300 flex items-center gap-1"><Trophy size={11} /> Leader</p>
                    <p className="text-sm font-black text-white truncate">{leader.name}{me && String(me.staffId) === String(leader.staffId) ? ' (You)' : ''}</p>
                    <p className="text-[11px] font-bold text-slate-300">{pct(leader.rate)} · {fmt(leader.enrolled)} enrolled</p>
                </div>
            </div>
            {/* Ranks 2..5 */}
            {board.length > 1 && (
                <div className="mt-3 flex flex-col gap-1.5">
                    {board.slice(1).map(b => {
                        const isMe = me && String(b.staffId) === String(me.staffId);
                        return (
                            <div key={b.rank} className={`flex items-center gap-2 rounded-xl px-2 py-1.5 ${isMe ? `bg-white/10 border ${t.icon}` : 'bg-black/20 border border-transparent'}`}>
                                <span className="w-6 text-[11px] font-black text-slate-400">#{b.rank}</span>
                                <Avatar image={b.image} name={b.name} size={24} />
                                <span className={`text-xs font-bold truncate flex-1 ${isMe ? 'text-white' : 'text-slate-300'}`}>{b.name}{isMe ? ' (You)' : ''}</span>
                                <span className="text-[11px] font-bold text-slate-300 shrink-0">{pct(b.rate)} · {fmt(b.enrolled)}</span>
                            </div>
                        );
                    })}
                </div>
            )}
            {/* Me, if not in the top 5 */}
            {me && me.rank && !meInTop && (
                <div className={`mt-2 flex items-center gap-2 rounded-xl px-2 py-1.5 bg-white/10 border ${t.icon}`}>
                    <span className="w-6 text-[11px] font-black text-white">#{me.rank}</span>
                    <Avatar image={me.image} name={me.name} size={24} />
                    <span className="text-xs font-bold text-white truncate flex-1">{me.name} (You)</span>
                    <span className="text-[11px] font-bold text-slate-200 shrink-0">{pct(me.rate)} · {fmt(me.enrolled)}</span>
                </div>
            )}
            {/* Rank line */}
            <div className="mt-2 text-[11px] font-bold flex items-center gap-1.5">
                <TrendingUp size={12} className="text-emerald-300" />
                {me && me.rank ? (
                    me.rank === 1
                        ? <span className="text-amber-300">You are #1 of {me.totalRanked}. Keep it up!</span>
                        : <span className="text-slate-200">You are <span className="text-white font-black">#{me.rank}</span> of {me.totalRanked}
                            {me.toNextRank ? <> · <span className="text-emerald-300">{me.toNextRank.needed} more enrolled to pass #{me.toNextRank.rank}</span></> : null}
                          </span>
                ) : <span className="text-slate-400">You have no assigned leads in this filter yet.</span>}
            </div>
        </div>
    );
};

const CoordinatorCampaignTile = ({ theme, icon: Icon, title, subtitle, data, navigate }) => {
    const t = THEMES[theme];
    if (!data) {
        return (
            <div className={`rounded-[1.75rem] border bg-gradient-to-br p-5 ${t.card} flex items-center justify-center min-h-[290px]`}>
                <p className="text-xs font-bold text-slate-400">{title}: data not available</p>
            </div>
        );
    }
    const me = data.me || {};
    const single = me.single || {};
    const target = data.target || {};
    const teamProgress = target.groupTargetCount > 0 ? (data.enrolled / target.groupTargetCount) * 100 : 0;
    const singleProgress = single.targetCount > 0 ? ((me.enrolled || 0) / single.targetCount) * 100 : (single.achieved ? 100 : 0);
    const go = () => navigate('/coordinator/dashboard?mode=CALL_CAMPAIGN');

    return (
        <div className={`rounded-[1.75rem] border bg-gradient-to-br p-5 transition-all ${t.card}`}>
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${t.icon}`}><Icon size={20} /></div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-wide text-white">{title}</h3>
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${t.sub}`}>{subtitle}</p>
                    </div>
                </div>
                <button type="button" onClick={go} className={`text-[11px] font-bold flex items-center gap-1 ${t.link}`}>Open <ArrowRight size={12} /></button>
            </div>

            {/* My conversion */}
            <div className="flex items-baseline gap-3 mt-4">
                <span className="text-4xl font-black text-white leading-none">{pct(me.rate)}</span>
                <span className="text-[11px] font-bold text-slate-300">my conversion · {fmt(me.enrolled)} enrolled of {fmt(me.assigned)}</span>
            </div>

            {/* My single goal */}
            <div className="mt-3">
                <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                    <span className="flex items-center gap-1 text-cyan-300"><Target size={12} /> My goal {single.goal ?? target.individual}%</span>
                    {single.achieved
                        ? <span className="text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded-md">Achieved</span>
                        : <span className="text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded-md">Need {fmt(single.needed)} more</span>}
                </div>
                <ProgressBar value={singleProgress} color={single.achieved ? 'bg-emerald-400' : t.bar} />
            </div>

            {/* Team target */}
            <div className="mt-3">
                <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                    <span className="flex items-center gap-1 text-slate-300"><Users size={12} /> Team {pct(data.conversionRate)} · target {target.group}%</span>
                    {target.achieved
                        ? <span className="text-emerald-300">Team target achieved</span>
                        : <span className="text-slate-400">Team needs {fmt(target.neededForGroup)} more</span>}
                </div>
                <ProgressBar value={teamProgress} color="bg-slate-300/70" />
            </div>

            {/* My status boxes */}
            <div className="grid grid-cols-4 gap-2 mt-3">
                <StatBox label="Pending" value={me.pending} color="text-amber-400" onClick={go} />
                <StatBox label="Answered" value={me.answered} color="text-emerald-400" onClick={go} />
                <StatBox label="No answer" value={me.noAnswer} color="text-slate-200" onClick={go} />
                <StatBox label="Reject" value={me.reject} color="text-rose-400" onClick={go} />
            </div>

            {/* Leaderboard */}
            <Leaderboard data={data} theme={theme} />

            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 mt-3">
                <Clock size={12} /> Contacted {pct(me.contactedRate)} · Direct paid {fmt(me.directPaid)} · Delayed: <span className="text-rose-400 font-bold">{fmt(me.delayed)}</span>
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

export default function CampaignSummaryTiles({ businessId, batchId, mode = 'manager' }) {
    const isCoordinator = mode === 'coordinator';
    const navigate = useNavigate();
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);
    const timerRef = useRef(null);

    const fetchSummary = async (force = false) => {
        if (!businessId) return;
        try {
            const res = await axios.get('/after-seminar-crm/stats/campaign-summary', {
                params: { businessId, batchId: batchId || 'ALL', ...(isCoordinator ? { mine: 1 } : {}), ...(force ? { refresh: 1 } : {}) }
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
    }, [businessId, batchId, mode]);

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

    if (isCoordinator) {
        return (
            <div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <CoordinatorCampaignTile theme="violet" icon={PhoneCall} title="Open Seminar Campaign" subtitle="My free seminar leads → enrolled" data={os} navigate={navigate} />
                    <CoordinatorCampaignTile theme="teal" icon={UserPlus} title="New Inquiries Campaign" subtitle="My fresh leads → enrolled" data={ni} navigate={navigate} />
                </div>
                <div className="flex justify-end items-center gap-2 mt-1.5 text-[10px] font-semibold text-slate-500">
                    {lastUpdated && <span>Updated {lastUpdated.toLocaleTimeString()}</span>}
                    <button type="button" onClick={() => fetchSummary(true)} className="hover:text-slate-300 flex items-center gap-1" title="Refresh now">
                        <RefreshCw size={11} /> Refresh
                    </button>
                </div>
            </div>
        );
    }

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
