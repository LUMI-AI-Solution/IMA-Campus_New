import React, { useEffect, useMemo, useState } from 'react';
import axios from '../../api/axios';
import toast from 'react-hot-toast';
import { FlaskConical, RefreshCw, Download, Search, Undo2, AlertTriangle } from 'lucide-react';

// 🔥 REAL INCOME (TESTING) — Finance Manager only 🔥
// Salary cycle = 1st to last day of the month, by APPROVAL date.
// This month income = this month's Finance-Matrix share + back-dated shares approved in this cycle.
// The normal Finance Matrix and Teacher Salary are not changed.

const fmt = (n) => (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const thisCycle = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const Card = ({ label, value, sub, tone = 'slate' }) => {
    const tones = {
        slate: 'border-slate-700 bg-slate-900/60 text-white',
        purple: 'border-violet-500/40 bg-violet-950/40 text-violet-200',
        green: 'border-emerald-500/40 bg-emerald-950/40 text-emerald-200',
        amber: 'border-amber-500/40 bg-amber-950/30 text-amber-200',
        rose: 'border-rose-500/30 bg-rose-950/30 text-rose-200'
    };
    return (
        <div className={`rounded-2xl border p-4 ${tones[tone]}`}>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</p>
            <p className="text-2xl font-black mt-1">Rs. {fmt(value)}</p>
            {sub && <p className="text-[11px] font-semibold opacity-70 mt-1">{sub}</p>}
        </div>
    );
};

export default function RealIncomeTesting() {
    const [allowed, setAllowed] = useState(null);
    const [businesses, setBusinesses] = useState([]);
    const [batches, setBatches] = useState([]);
    const [selectedBiz, setSelectedBiz] = useState('');
    const [selectedBatch, setSelectedBatch] = useState('');
    const [classType, setClassType] = useState('1');
    const [cycle, setCycle] = useState(thisCycle());
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [onlyBackdated, setOnlyBackdated] = useState(false);

    useEffect(() => {
        axios.get('/admin/data-export/real-income/access')
            .then(r => setAllowed(Boolean(r.data?.allowed)))
            .catch(() => setAllowed(false));
        axios.get('/admin/businesses')
            .then(r => {
                const list = r.data?.businesses || r.data || [];
                setBusinesses(list);
                if (list.length > 0) setSelectedBiz(String(list[0].id));
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (!selectedBiz) return;
        setSelectedBatch('');
        setData(null);
        axios.get(`/admin/batches/${selectedBiz}`)
            .then(r => setBatches(r.data?.batches || r.data || []))
            .catch(() => setBatches([]));
    }, [selectedBiz]);

    const load = async () => {
        if (!selectedBatch) return toast.error('Select a batch');
        setLoading(true);
        try {
            const r = await axios.get('/admin/data-export/real-income', {
                params: { businessId: selectedBiz, batchId: selectedBatch, classType, cycle },
                timeout: 120000
            });
            setData(r.data);
        } catch (e) {
            toast.error(e.response?.data?.error || 'Failed to load Real Income');
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedBatch && cycle) load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedBatch, classType, cycle]);

    const rows = useMemo(() => {
        if (!data) return [];
        const q = search.trim().toLowerCase();
        return data.rows.filter(r => {
            if (onlyBackdated && !(r.backdated > 0)) return false;
            if (!q) return true;
            return String(r.studentName || '').toLowerCase().includes(q) || String(r.phone || '').includes(q) || String(r.studentNo || '').toLowerCase().includes(q);
        });
    }, [data, search, onlyBackdated]);

    const exportCsv = () => {
        if (!data) return;
        const subs = data.subjects;
        const header = ['Student No', 'Student', 'Phone', ...subs.flatMap(s => [`${s} - This month`, `${s} - Back-dated`]), 'This Month', 'Back-dated', 'Back-dated months', 'Real Income', 'Old Matrix (this month)', 'Advance (info)'];
        const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const lines = [header.map(esc).join(',')];
        rows.forEach(r => {
            lines.push([
                r.studentNo, r.studentName, r.phone,
                ...subs.flatMap(s => [r.subjects[s]?.thisMonth || 0, r.subjects[s]?.backdated || 0]),
                r.thisMonth, r.backdated, r.backdatedMonths.map(b => `${b.month}: ${b.amount}`).join(' | '), r.income, r.oldMatrixMonth, r.advance
            ].map(esc).join(','));
        });
        lines.push(['', 'TOTAL', '', ...subs.flatMap(s => [data.subjectTotals[s]?.thisMonth || 0, data.subjectTotals[s]?.backdated || 0]),
            data.totals.thisMonth, data.totals.backdated, '', data.totals.income, data.totals.oldMatrixMonth, data.totals.advance].map(esc).join(','));
        const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `real-income-TESTING-${cycle}-batch${selectedBatch}-${classType === '2' ? 'paper' : 'theory'}.csv`;
        a.click();
    };

    if (allowed === false) {
        return (
            <div className="p-10 text-center text-slate-300">
                <AlertTriangle className="mx-auto mb-3 text-amber-400" />
                Real Income (TESTING) is only available to the Finance Manager.
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 text-slate-200">
            {/* Header */}
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 mb-4 flex flex-wrap items-center gap-3">
                <FlaskConical className="text-amber-300" size={20} />
                <div className="flex-1 min-w-[220px]">
                    <h1 className="text-lg font-black text-white">Real Income <span className="text-amber-300">TESTING</span></h1>
                    <p className="text-[11px] text-amber-100/80">
                        Salary cycle = 1st – last day of the month, by approval date. Back-dated payments approved in this cycle are counted as this cycle's income.
                        The normal Finance Matrix and Teacher Salary are not changed.
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-4">
                <select value={selectedBiz} onChange={e => setSelectedBiz(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm">
                    {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <select value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm min-w-[200px]">
                    <option value="">Select batch...</option>
                    {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <select value={classType} onChange={e => setClassType(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm">
                    <option value="1">Theory Class</option>
                    <option value="2">Paper Class</option>
                </select>
                <input type="month" value={cycle} onChange={e => setCycle(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
                <button type="button" onClick={load} disabled={loading || !selectedBatch} className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg px-3 py-2 text-sm font-bold flex items-center gap-1.5">
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {loading ? 'Calculating...' : 'Calculate'}
                </button>
                {data && (
                    <button type="button" onClick={exportCsv} className="bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm font-bold flex items-center gap-1.5">
                        <Download size={14} /> Export CSV
                    </button>
                )}
            </div>

            {!data && !loading && <p className="text-sm text-slate-400">Select a batch and a cycle month.</p>}
            {loading && !data && <p className="text-sm text-slate-400">Running the Finance Matrix engine three times (all / approved before cycle / approved by cycle end)...</p>}

            {data && (
                <>
                    {/* Summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-3">
                        <Card label={`${data.cycle.label} share (this month)`} value={data.totals.thisMonth}
                            sub={data.currentMonthGroup ? `Matrix month: ${data.currentMonthGroup.name}` : 'No monthly group for this month in the batch'} />
                        <Card label="Back-dated collected this cycle" value={data.totals.backdated} tone="purple"
                            sub={data.backdatedByMonth.map(b => `${b.month}: ${fmt(b.amount)} (${b.students})`).join(' · ') || 'None'} />
                        <Card label={`Real income · ${data.cycle.label}`} value={data.totals.income} tone="green" sub="This month + back-dated" />
                        <Card label="Old Finance Matrix (this month column)" value={data.totals.oldMatrixMonth} tone="slate"
                            sub={`Difference: Rs. ${fmt(data.totals.income - data.totals.oldMatrixMonth)}`} />
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4 text-[11px] font-semibold">
                        <span className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700">Payments approved in cycle: {data.paymentsApprovedInCycle.count} · Rs. {fmt(data.paymentsApprovedInCycle.amount)}</span>
                        <span className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700">Approved after cycle end for this month (moves to a later cycle): Rs. {fmt(data.totals.lateForThisMonth)}</span>
                        <span className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700">Advance for future months (info, not counted): Rs. {fmt(data.totals.advance)}</span>
                        {data.paymentsApprovedInCycle.approximatedApprovalTime > 0 && (
                            <span className="px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-200 flex items-center gap-1">
                                <AlertTriangle size={12} /> {data.paymentsApprovedInCycle.approximatedApprovalTime} payments have no saved approval time (approved before this update) — last-updated time used
                            </span>
                        )}
                    </div>

                    {/* Table controls */}
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                        <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-2">
                            <Search size={14} className="text-slate-500" />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student / phone" className="bg-transparent py-1.5 text-sm outline-none" />
                        </div>
                        <label className="flex items-center gap-2 text-xs font-semibold">
                            <input type="checkbox" checked={onlyBackdated} onChange={e => setOnlyBackdated(e.target.checked)} /> Only students with back-dated payments
                        </label>
                        <span className="text-xs text-slate-400">{rows.length} students</span>
                    </div>

                    {/* Table */}
                    <div className="overflow-auto rounded-2xl border border-slate-700 max-h-[65vh]">
                        <table className="min-w-full text-xs">
                            <thead className="bg-slate-900 sticky top-0 z-10">
                                <tr className="text-left text-[10px] uppercase tracking-wider text-slate-400">
                                    <th className="px-3 py-2">Student</th>
                                    {data.subjects.map(s => <th key={s} className="px-3 py-2 min-w-[130px]">{s}</th>)}
                                    <th className="px-3 py-2 text-right">This month</th>
                                    <th className="px-3 py-2 text-right text-violet-300">Back-dated</th>
                                    <th className="px-3 py-2 text-right text-emerald-300">Real income</th>
                                    <th className="px-3 py-2 text-right">Old matrix</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map(r => (
                                    <tr key={r.id} className="border-t border-slate-800 hover:bg-slate-800/40">
                                        <td className="px-3 py-2">
                                            <p className="font-bold text-white">{r.studentName}</p>
                                            <p className="text-[10px] text-slate-500">{r.studentNo} · {r.phone}</p>
                                        </td>
                                        {data.subjects.map(s => {
                                            const c = r.subjects[s] || {};
                                            return (
                                                <td key={s} className="px-3 py-2 align-top">
                                                    {c.thisMonth ? <p>{fmt(c.thisMonth)}</p> : <p className="text-slate-600">—</p>}
                                                    {(c.backdatedMonths || []).map(b => (
                                                        <p key={b.month} className="text-[10px] text-violet-300 flex items-center gap-1"><Undo2 size={9} /> {b.month}: {fmt(b.amount)}</p>
                                                    ))}
                                                </td>
                                            );
                                        })}
                                        <td className="px-3 py-2 text-right">{fmt(r.thisMonth)}</td>
                                        <td className="px-3 py-2 text-right text-violet-300 font-bold">
                                            {r.backdated ? fmt(r.backdated) : '—'}
                                            {r.backdatedMonths.length > 0 && <p className="text-[9px] font-semibold text-violet-400/80">{r.backdatedMonths.map(b => b.month).join(', ')}</p>}
                                        </td>
                                        <td className="px-3 py-2 text-right text-emerald-300 font-black">{fmt(r.income)}</td>
                                        <td className="px-3 py-2 text-right text-slate-400">{fmt(r.oldMatrixMonth)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-slate-900 sticky bottom-0">
                                <tr className="font-black border-t border-slate-600">
                                    <td className="px-3 py-2">TOTAL ({data.rows.length})</td>
                                    {data.subjects.map(s => (
                                        <td key={s} className="px-3 py-2 align-top">
                                            <p>{fmt(data.subjectTotals[s]?.thisMonth)}</p>
                                            {data.subjectTotals[s]?.backdated ? <p className="text-[10px] text-violet-300">↩ {fmt(data.subjectTotals[s].backdated)}</p> : null}
                                        </td>
                                    ))}
                                    <td className="px-3 py-2 text-right">{fmt(data.totals.thisMonth)}</td>
                                    <td className="px-3 py-2 text-right text-violet-300">{fmt(data.totals.backdated)}</td>
                                    <td className="px-3 py-2 text-right text-emerald-300">{fmt(data.totals.income)}</td>
                                    <td className="px-3 py-2 text-right text-slate-400">{fmt(data.totals.oldMatrixMonth)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}