import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../api/axios';
import { toast } from 'react-hot-toast';
import {
    BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
    CalendarClock, ListChecks, PhoneCall, ListTodo, Filter, BarChart3, MessageSquare, PhoneIncoming,
    Radio, CheckCircle2, Circle, AlertTriangle, Clock, User, ArrowUpRight, Save
} from 'lucide-react';

// 🔥 Coordinator Overview — everything BELOW the greeting + 4 campaign tiles.
// Row 1 (today): classes timeline · daily tasks · today's calls (donut)
// Row 2: pending work (horizontal bars) · performance funnel
// Row 3: last 7 days calls (stacked bars, same style as manager "Course Enrollments") · messages + manual call log
// All numbers are the logged-in coordinator's own (backend uses req.user). No sample data anywhere.

const CARD = 'bg-white/[0.03] backdrop-blur-2xl p-6 rounded-[2rem] border border-white/10 shadow-xl flex flex-col min-w-0';
const HEAD = 'text-xs font-black text-white mb-4 uppercase tracking-widest flex items-center justify-between gap-2 border-b border-white/5 pb-4';
const BADGE = 'text-[9px] px-2 py-1 rounded-md border font-black normal-case tracking-normal';
const TOOLTIP = { backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', color: '#0f172a', fontSize: '11px', fontWeight: 'bold' };
const CAMPAIGN_COLORS = { openSem: '#ec4899', newInq: '#3b82f6', paid: '#f59e0b', other: '#94a3b8' };
const OUTCOME_META = [
    { key: 'answered', label: 'Answered', color: '#10b981' },
    { key: 'noAnswer', label: 'No answer', color: '#f59e0b' },
    { key: 'reject', label: 'Rejected', color: '#f43f5e' },
    { key: 'other', label: 'Other', color: '#94a3b8' },
];
const CALL_LINK = '/coordinator/dashboard?mode=CALL_CAMPAIGN';
const CHAT_LINK = '/workspace/crm';
const TASK_LINK = '/workspace/tasks';

const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });
const lkNow = () => { const n = new Date(); return new Date(n.getTime() + (n.getTimezoneOffset() + 330) * 60000); };

// "09:00", "9:00 AM", "14:30", "2.30 PM" → minutes since midnight (null if unreadable)
const toMinutes = (str) => {
    const m = String(str || '').trim().match(/^(\d{1,2})[:.](\d{2})\s*([AaPp][Mm])?$/);
    if (!m) return null;
    let h = parseInt(m[1]); const min = parseInt(m[2]); const ap = m[3]?.toUpperCase();
    if (ap === 'PM' && h < 12) h += 12;
    if (ap === 'AM' && h === 12) h = 0;
    return h * 60 + min;
};
const fmtLeft = (mins) => mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;

const Empty = ({ icon: Icon, text }) => (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-500 text-sm font-bold bg-white/[0.01] rounded-2xl border border-dashed border-white/10 p-6 text-center min-h-[160px]">
        <Icon size={26} className="text-slate-600" />
        {text}
    </div>
);

const Skeleton = ({ h = 'h-[300px]' }) => <div className={`${CARD} ${h} animate-pulse`}><div className="h-4 w-40 bg-white/10 rounded mb-6" /><div className="flex-1 bg-white/5 rounded-2xl" /></div>;

// ---------------------------------------------------------------- Row 1
const TodayClasses = ({ classes }) => {
    const nowMin = (() => { const n = lkNow(); return n.getHours() * 60 + n.getMinutes(); })();
    const rows = (classes || []).map(c => {
        const s = toMinutes(c.startTime), e = toMinutes(c.endTime);
        let state = 'unknown';
        if (s !== null && e !== null) state = nowMin < s ? 'upcoming' : nowMin <= e ? 'live' : 'done';
        return { ...c, s, state };
    });
    const nextId = rows.find(r => r.state === 'upcoming')?.id;
    const STATE = {
        live: { bar: 'bg-rose-500', chip: 'bg-rose-500/15 text-rose-300 border-rose-500/30', label: 'Live now' },
        upcoming: { bar: 'bg-blue-500', chip: 'bg-blue-500/15 text-blue-300 border-blue-500/30', label: 'Upcoming' },
        done: { bar: 'bg-emerald-500', chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', label: 'Done' },
        unknown: { bar: 'bg-slate-500', chip: 'bg-white/5 text-slate-300 border-white/10', label: 'Today' },
    };
    return (
        <div className={`${CARD} h-[380px]`}>
            <h3 className={HEAD}>
                <span className="flex items-center gap-2"><CalendarClock size={14} className="text-blue-400" /> Today's Classes</span>
                <span className={`${BADGE} bg-blue-500/20 text-blue-300 border-blue-500/30`}>{rows.length} classes</span>
            </h3>
            {rows.length === 0 ? <Empty icon={CalendarClock} text="No classes for your batches today." /> : (
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-3">
                    {rows.map(c => {
                        const st = STATE[c.state];
                        const isNext = c.id === nextId;
                        return (
                            <div key={c.id} className={`relative overflow-hidden rounded-xl border p-3 pl-5 bg-black/20 ${isNext ? 'border-blue-400/40' : 'border-white/5'} ${c.state === 'done' ? 'opacity-70' : ''}`}>
                                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${st.bar}`} />
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="text-white font-black text-sm truncate">{c.subjectName || 'Class'}</p>
                                        {c.title && <p className="text-[11px] text-slate-400 font-semibold truncate">{c.title}</p>}
                                    </div>
                                    <span className={`shrink-0 text-[10px] font-black px-2 py-0.5 rounded-md border flex items-center gap-1 ${st.chip}`}>
                                        {c.state === 'live' && <Radio size={10} className="animate-pulse" />}
                                        {c.state === 'upcoming' && isNext ? `in ${fmtLeft(c.s - nowMin)}` : st.label}
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2 text-[10px] font-bold text-slate-400">
                                    <span className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-md"><Clock size={10} className="text-blue-400" /> {c.startTime} – {c.endTime}</span>
                                    {c.lecturerName && <span className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-md"><User size={10} className="text-emerald-400" /> {c.lecturerName}</span>}
                                    {c.batchName && <span className="bg-white/5 px-2 py-0.5 rounded-md">{c.batchName}</span>}
                                    {c.state !== 'done' && !c.hasLiveLink && <span className="bg-amber-500/15 text-amber-300 px-2 py-0.5 rounded-md">No live link yet</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const ProgressRing = ({ value, total, color = '#8b5cf6', size = 84 }) => {
    const R = size / 2 - 7, C = 2 * Math.PI * R;
    const pct = total > 0 ? value / total : 0;
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 shrink-0">
            <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
            <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
                strokeDasharray={C} strokeDashoffset={C * (1 - pct)} style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
        </svg>
    );
};

const DailyTasks = ({ tasks, summary }) => {
    const list = [...(tasks || [])].sort((a, b) => (a.done - b.done) || (b.overdue - a.overdue) || (b.dueToday - a.dueToday));
    const s = summary || { total: 0, done: 0, overdue: 0, dueToday: 0 };
    return (
        <div className={`${CARD} h-[380px]`}>
            <h3 className={HEAD}>
                <span className="flex items-center gap-2"><ListChecks size={14} className="text-violet-400" /> Daily Tasks</span>
                <Link to={TASK_LINK} className="text-[10px] font-black text-violet-300 hover:text-white flex items-center gap-1 normal-case tracking-normal">Open <ArrowUpRight size={11} /></Link>
            </h3>
            {list.length === 0 ? <Empty icon={ListChecks} text="No tasks for you today." /> : (
                <>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="relative">
                            <ProgressRing value={s.done} total={s.total} />
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-lg font-black text-white leading-none">{s.done}/{s.total}</span>
                                <span className="text-[9px] font-bold text-slate-400">done</span>
                            </div>
                        </div>
                        <div className="space-y-1.5 text-[11px] font-bold">
                            <p className="text-slate-300">{s.total - s.done} still open</p>
                            {s.dueToday > 0 && <p className="text-amber-300">{s.dueToday} due today</p>}
                            {s.overdue > 0 && <p className="text-rose-400 flex items-center gap-1"><AlertTriangle size={11} /> {s.overdue} overdue</p>}
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-1.5">
                        {list.map(t => (
                            <div key={t.id} className={`flex items-center gap-2 text-xs font-semibold rounded-lg px-2.5 py-1.5 ${t.overdue ? 'bg-rose-500/10 text-rose-300' : t.done ? 'text-slate-500' : 'bg-white/[0.03] text-slate-200'}`}>
                                {t.done ? <CheckCircle2 size={14} className="text-emerald-400 shrink-0" /> : t.overdue ? <AlertTriangle size={14} className="shrink-0" /> : <Circle size={14} className="text-slate-500 shrink-0" />}
                                <span className={`truncate ${t.done ? 'line-through' : ''}`}>{t.title}</span>
                                {!t.done && t.deadline && (
                                    <span className="ml-auto shrink-0 text-[10px] text-slate-400">
                                        {new Date(t.deadline).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Colombo' })}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

const TodayCalls = ({ calls, pendingCalls }) => {
    const c = calls || { total: 0, byOutcome: {}, byCampaign: {} };
    const pie = OUTCOME_META.map(o => ({ name: o.label, value: c.byOutcome?.[o.key] || 0, color: o.color })).filter(d => d.value > 0);
    const planned = c.total + (pendingCalls || 0);
    const pct = planned > 0 ? Math.round((c.total / planned) * 100) : 0;
    return (
        <div className={`${CARD} h-[380px]`}>
            <h3 className={HEAD}>
                <span className="flex items-center gap-2"><PhoneCall size={14} className="text-emerald-400" /> Today's Calls</span>
                <Link to={CALL_LINK} className="text-[10px] font-black text-emerald-300 hover:text-white flex items-center gap-1 normal-case tracking-normal">Call now <ArrowUpRight size={11} /></Link>
            </h3>
            {c.total === 0 ? (
                <Empty icon={PhoneCall} text={pendingCalls > 0 ? `No calls yet today · ${pendingCalls} waiting for you` : 'No calls yet today.'} />
            ) : (
                <>
                    <div className="flex items-center gap-3">
                        <div className="relative w-[150px] h-[150px] shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={pie} cx="50%" cy="50%" innerRadius={48} outerRadius={70} paddingAngle={3} dataKey="value" stroke="none">
                                        {pie.map((d, i) => <Cell key={i} fill={d.color} />)}
                                    </Pie>
                                    <Tooltip contentStyle={TOOLTIP} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-2xl font-black text-white leading-none">{c.total}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">calls</span>
                            </div>
                        </div>
                        <div className="space-y-1.5 text-[11px] font-bold flex-1 min-w-0">
                            {OUTCOME_META.map(o => (
                                <div key={o.key} className="flex items-center gap-2 text-slate-300">
                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: o.color }} />
                                    <span className="truncate">{o.label}</span>
                                    <span className="ml-auto text-white">{c.byOutcome?.[o.key] || 0}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="mt-auto pt-3">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                            <span>{c.total} done · {pendingCalls || 0} pending</span><span className="text-emerald-300">{pct}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2.5 text-[10px] font-bold text-slate-400">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: CAMPAIGN_COLORS.openSem }} /> Open Sem {c.byCampaign?.openSem || 0}</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: CAMPAIGN_COLORS.newInq }} /> New Inq {c.byCampaign?.newInq || 0}</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: CAMPAIGN_COLORS.paid }} /> Paid {c.byCampaign?.paid || 0}</span>
                            {(c.byCampaign?.other || 0) > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: CAMPAIGN_COLORS.other }} /> Other {c.byCampaign.other}</span>}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

// ---------------------------------------------------------------- Row 2
const PendingWork = ({ todo }) => {
    const rows = todo ? [
        { name: 'Open Seminar', value: todo.openSemPending || 0, color: '#ec4899', to: CALL_LINK },
        { name: 'Free Seminar', value: todo.freeSemPending || 0, color: '#06b6d4', to: CALL_LINK },
        { name: 'Unread Chats', value: todo.unreadChats || 0, color: '#10b981', to: CHAT_LINK },
        { name: 'New Inq R1', value: todo.newInqR1Pending || 0, color: '#3b82f6', to: CALL_LINK },
        { name: 'New Inq R2', value: todo.newInqR2Pending || 0, color: '#8b5cf6', to: CALL_LINK },
        { name: 'R1 Unanswered', value: todo.newInqR1NoAnswer || 0, color: '#f43f5e', to: CALL_LINK },
        { name: 'R2 Unanswered', value: todo.newInqR2NoAnswer || 0, color: '#fb7185', to: CALL_LINK },
    ] : [];
    const total = rows.reduce((a, r) => a + r.value, 0);
    const max = Math.max(1, ...rows.map(r => r.value));
    return (
        <div className={CARD}>
            <h3 className={HEAD}>
                <span className="flex items-center gap-2"><ListTodo size={14} className="text-amber-400" /> Pending Work</span>
                <span className={`${BADGE} ${total > 0 ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'}`}>{total > 0 ? `${total} pending` : 'All clear'}</span>
            </h3>
            {!todo ? <Empty icon={ListTodo} text="Pending counts are not available." /> : (
                <div className="space-y-3">
                    {rows.map(r => (
                        <Link key={r.name} to={r.to} className="group grid grid-cols-[110px_1fr_36px] items-center gap-3">
                            <span className="text-[11px] font-bold text-slate-300 group-hover:text-white truncate">{r.name}</span>
                            <div className="h-3 rounded-full bg-white/5 overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-700 group-hover:brightness-125"
                                    style={{ width: `${r.value === 0 ? 0 : Math.max(4, (r.value / max) * 100)}%`, background: r.color }} />
                            </div>
                            <span className={`text-sm font-black text-right ${r.value > 0 ? 'text-white' : 'text-slate-600'}`}>{r.value}</span>
                        </Link>
                    ))}
                </div>
            )}
            {todo && total > 0 && (() => {
                const top = [...rows].sort((a, b) => b.value - a.value)[0];
                return (
                    <Link to={top.to} className="mt-auto pt-5 group">
                        <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 group-hover:border-white/20 transition-colors">
                            <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Start with</p>
                                <p className="text-sm font-black text-white truncate">{top.name} · {top.value} waiting</p>
                            </div>
                            <span className="shrink-0 flex items-center gap-1 text-[11px] font-black text-white rounded-xl px-3 py-2" style={{ background: top.color }}>
                                Go <ArrowUpRight size={12} />
                            </span>
                        </div>
                    </Link>
                );
            })()}
        </div>
    );
};

const PerformanceFunnel = ({ overall }) => {
    const o = overall || {};
    const steps = [
        { label: 'Assigned', value: o.assigned || 0, color: 'from-indigo-400 to-indigo-600' },
        { label: 'Covered', value: o.covered || 0, color: 'from-violet-400 to-violet-600' },
        { label: 'Answered', value: o.callAnswers || 0, color: 'from-fuchsia-400 to-fuchsia-600' },
        { label: 'Enrolled', value: o.enrolled || 0, color: 'from-emerald-400 to-emerald-600' },
    ];
    const top = Math.max(1, steps[0].value);
    return (
        <div className={CARD}>
            <h3 className={HEAD}>
                <span className="flex items-center gap-2"><Filter size={14} className="text-fuchsia-400" /> Performance Funnel</span>
                <span className={`${BADGE} bg-white/5 text-slate-300 border-white/10`}>{o.pending || 0} still pending</span>
            </h3>
            <div className="space-y-2.5">
                {steps.map((s, i) => {
                    const w = Math.max(18, (s.value / top) * 100);
                    const fromPrev = i > 0 && steps[i - 1].value > 0 ? Math.round((s.value / steps[i - 1].value) * 100) : null;
                    return (
                        <div key={s.label} className="flex flex-col items-center">
                            <div className={`h-11 rounded-xl bg-gradient-to-r ${s.color} flex items-center justify-between px-4 shadow-lg transition-all duration-700`} style={{ width: `${w}%`, minWidth: 170 }}>
                                <span className="text-[11px] font-black uppercase tracking-wider text-white/90">{s.label}</span>
                                <span className="text-lg font-black text-white">{s.value}</span>
                            </div>
                            {fromPrev !== null && <span className="text-[9px] font-bold text-slate-500 mt-0.5">{fromPrev}% of {steps[i - 1].label.toLowerCase()}</span>}
                        </div>
                    );
                })}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-5">
                <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Conversion</p>
                    <p className="text-2xl font-black text-white">{o.conversionRate || 0}<span className="text-base text-emerald-400">%</span></p>
                </div>
                <div className="rounded-2xl bg-blue-500/10 border border-blue-500/20 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-300">Response</p>
                    <p className="text-2xl font-black text-white">{o.responseRate || 0}<span className="text-base text-blue-400">%</span></p>
                </div>
            </div>
        </div>
    );
};

// ---------------------------------------------------------------- Row 3
const Last7Days = ({ last7 }) => {
    const data = (last7 || []).map(d => ({
        ...d,
        label: new Date(`${d.date}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })
    }));
    const total = data.reduce((a, d) => a + (d.total || 0), 0);
    const hasOther = data.some(d => d.other > 0);
    return (
        <div className={`${CARD} lg:col-span-2`}>
            <h3 className={HEAD}>
                <span className="flex items-center gap-2"><BarChart3 size={14} className="text-pink-400" /> My Calls · Last 7 Days</span>
                <span className={`${BADGE} bg-pink-500/20 text-pink-300 border-pink-500/30`}>{total} calls</span>
            </h3>
            <div className="flex-1 min-h-[260px]">
                {total === 0 ? <Empty icon={BarChart3} text="No calls in the last 7 days." /> : (
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" vertical={false} />
                            <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickMargin={10} />
                            <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                            <Tooltip cursor={{ fill: 'transparent' }} contentStyle={TOOLTIP} />
                            <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                            <Bar dataKey="openSem" name="Open Seminar" fill={CAMPAIGN_COLORS.openSem} radius={[4, 4, 0, 0]} stackId="a" />
                            <Bar dataKey="newInq" name="New Inquiries" fill={CAMPAIGN_COLORS.newInq} radius={[4, 4, 0, 0]} stackId="a" />
                            <Bar dataKey="paid" name="Paid" fill={CAMPAIGN_COLORS.paid} radius={[4, 4, 0, 0]} stackId="a" />
                            {hasOther && <Bar dataKey="other" name="Other" fill={CAMPAIGN_COLORS.other} radius={[4, 4, 0, 0]} stackId="a" />}
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};

const MessagesAndLog = ({ today, logs, onSaved }) => {
    const [newInq, setNewInq] = useState(0);
    const [general, setGeneral] = useState(0);
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        setNewInq(logs?.today?.newInqCalls || 0);
        setGeneral(logs?.today?.generalInqCalls || 0);
    }, [logs]);

    const save = async () => {
        setSaving(true);
        const id = toast.loading('Saving daily logs...');
        try {
            await axios.post('/coordinator-crm/v2-daily-logs', { newInqCalls: newInq, generalInqCalls: general }, { headers: authHeader() });
            toast.success('Logs saved', { id });
            onSaved && onSaved();
        } catch (e) {
            toast.error('Failed to save logs', { id });
        } finally {
            setSaving(false);
        }
    };

    const t = today || {};
    const stepper = (val, set, label) => (
        <div className="flex-1 rounded-2xl bg-black/20 border border-white/5 p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{label}</p>
            <div className="flex items-center justify-between">
                <button type="button" onClick={() => set(Math.max(0, val - 1))} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white font-black">−</button>
                <input type="number" min="0" value={val} onChange={e => set(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-14 text-center bg-transparent text-xl font-black text-white outline-none" />
                <button type="button" onClick={() => set(val + 1)} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white font-black">+</button>
            </div>
        </div>
    );

    return (
        <div className={CARD}>
            <h3 className={HEAD}>
                <span className="flex items-center gap-2"><MessageSquare size={14} className="text-cyan-400" /> Messages Today</span>
            </h3>
            <div className="grid grid-cols-3 gap-2 mb-5">
                {[['Sent', t.msgsSent, 'text-cyan-300'], ['Received', t.msgsReceived, 'text-emerald-300'], ['Contacts', t.uniqueNumbers, 'text-violet-300']].map(([l, v, c]) => (
                    <div key={l} className="rounded-2xl bg-black/20 border border-white/5 p-3 text-center">
                        <p className={`text-xl font-black ${c}`}>{v || 0}</p>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{l}</p>
                    </div>
                ))}
            </div>
            <h3 className="text-xs font-black text-white mb-1 uppercase tracking-widest flex items-center gap-2"><PhoneIncoming size={14} className="text-amber-400" /> Manual Call Log</h3>
            <p className="text-[11px] text-slate-500 font-semibold mb-3">Direct incoming calls today</p>
            <div className="flex gap-2">
                {stepper(newInq, setNewInq, 'New Inq')}
                {stepper(general, setGeneral, 'General')}
            </div>
            <button type="button" onClick={save} disabled={saving}
                className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500/90 hover:bg-amber-500 text-amber-950 font-black text-xs uppercase tracking-widest py-2.5 disabled:opacity-60">
                <Save size={14} /> Save log
            </button>
            <p className="text-[10px] text-slate-500 font-bold mt-2 text-center">
                This month: New Inq {logs?.monthlyTotal?.newInqCalls || 0} · General {logs?.monthlyTotal?.generalInqCalls || 0}
            </p>
        </div>
    );
};

// ---------------------------------------------------------------- Main
export default function CoordinatorOverviewInsights({ selectedBusiness, selectedBatch, refreshKey = 0 }) {
    const [todayData, setTodayData] = useState(null);
    const [stats, setStats] = useState(null);
    const [logs, setLogs] = useState(null);
    const [todo, setTodo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const params = useMemo(() => {
        const p = {};
        if (selectedBusiness && selectedBusiness !== 'ALL') p.businessId = selectedBusiness;
        if (selectedBatch && selectedBatch !== 'ALL') p.batchId = selectedBatch;
        return p;
    }, [selectedBusiness, selectedBatch]);

    const load = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        const headers = authHeader();
        const [t, s, l, d] = await Promise.allSettled([
            axios.get('/coordinator-crm/v2-today', { headers, params }),
            axios.get('/coordinator-crm/v2-overview-stats', { headers, params }),
            axios.get('/coordinator-crm/v2-daily-logs', { headers, params }),
            axios.get('/coordinator-crm/master-todo-stats', { headers, params: { businessId: selectedBusiness || 'ALL', batchId: selectedBatch || 'ALL' } }),
        ]);
        if (t.status === 'fulfilled') setTodayData(t.value.data);
        if (s.status === 'fulfilled') setStats(s.value.data);
        if (l.status === 'fulfilled') setLogs(l.value.data);
        if (d.status === 'fulfilled') {
            const me = JSON.parse(localStorage.getItem('user') || 'null');
            const rows = Array.isArray(d.value.data) ? d.value.data : [];
            setTodo(rows.find(r => String(r.id) === String(me?.id)) || rows[0] || null);
        }
        setError(t.status === 'rejected' && s.status === 'rejected');
        setLoading(false);
    }, [params, selectedBusiness, selectedBatch]);

    useEffect(() => { load(); }, [load, refreshKey]);
    useEffect(() => {
        const iv = setInterval(() => { if (!document.hidden) load(true); }, 60000);
        return () => clearInterval(iv);
    }, [load]);

    if (loading && !todayData && !stats) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><Skeleton h="h-[380px]" /><Skeleton h="h-[380px]" /><Skeleton h="h-[380px]" /></div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><Skeleton /><Skeleton /></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`${CARD} items-center text-center`}>
                <p className="text-slate-300 font-bold mb-3">Couldn't load your overview.</p>
                <button type="button" onClick={() => load()} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-black uppercase tracking-widest">Retry</button>
            </div>
        );
    }

    const pendingCalls = todo
        ? (todo.openSemPending || 0) + (todo.freeSemPending || 0) + (todo.newInqR1Pending || 0) + (todo.newInqR2Pending || 0) + (todo.newInqR1NoAnswer || 0) + (todo.newInqR2NoAnswer || 0)
        : 0;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <TodayClasses classes={todayData?.classes} />
                <DailyTasks tasks={todayData?.tasks} summary={todayData?.taskSummary} />
                <TodayCalls calls={todayData?.calls} pendingCalls={pendingCalls} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PendingWork todo={todo} />
                <PerformanceFunnel overall={stats?.overall} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Last7Days last7={todayData?.last7} />
                <MessagesAndLog today={stats?.today} logs={logs} onSaved={() => load(true)} />
            </div>
        </div>
    );
}
