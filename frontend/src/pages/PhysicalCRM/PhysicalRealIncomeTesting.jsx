import React, { useEffect, useMemo, useState } from 'react';
import physicalCrmService from '../../api/physicalCrm';
import toast from 'react-hot-toast';
import { 
  FlaskConical, 
  RefreshCw, 
  Download, 
  Search, 
  Undo2, 
  AlertTriangle, 
  User, 
  Calendar, 
  DollarSign, 
  Percent,
  CheckCircle,
  FileSpreadsheet,
  FileText,
  Filter
} from 'lucide-react';
import LecturerInvoiceModal from '../../components/PhysicalCRM/LecturerInvoiceModal';

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
    rose: 'border-rose-500/30 bg-rose-950/30 text-rose-200',
    cyan: 'border-cyan-500/40 bg-cyan-950/40 text-cyan-200'
  };
  return (
    <div className={`rounded-2xl border p-4 ${tones[tone]} shadow-lg backdrop-blur-md transition-all hover:scale-[1.01]`}>
      <p className="text-[10px] font-black uppercase tracking-widest opacity-75">{label}</p>
      <p className="text-2xl font-black mt-1">Rs. {fmt(value)}</p>
      {sub && <p className="text-[11px] font-semibold opacity-80 mt-1 truncate" title={typeof sub === 'string' ? sub : ''}>{sub}</p>}
    </div>
  );
};

export default function PhysicalRealIncomeTesting() {
  const [allowed, setAllowed] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('ALL');
  const [cycle, setCycle] = useState(thisCycle());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [onlyBackdated, setOnlyBackdated] = useState(false);
  const [onlyPaid, setOnlyPaid] = useState(true);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  // Load teachers on mount
  useEffect(() => {
    physicalCrmService.checkRealIncomeAccess()
      .then(r => setAllowed(Boolean(r?.allowed)))
      .catch(() => setAllowed(true));

    physicalCrmService.getTeachers()
      .then(res => {
        const list = Array.isArray(res) ? res : (res?.teachers || []);
        setTeachers(list);
        if (list.length > 0) {
          setSelectedTeacher(String(list[0].id));
        }
      })
      .catch(err => {
        console.error('Failed to load teachers:', err);
        toast.error('Failed to load teachers list');
      });
  }, []);

  const loadReport = async () => {
    if (!selectedTeacher) {
      toast.error('Please select a teacher');
      return;
    }
    setLoading(true);
    try {
      const res = await physicalCrmService.getRealIncome({
        teacherId: selectedTeacher,
        cycle,
        classId: selectedClassId
      });
      setData(res);
    } catch (err) {
      console.error('Real Income load error:', err);
      toast.error(err.response?.data?.error || 'Failed to load Real Income data');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTeacher && cycle) {
      loadReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeacher, cycle, selectedClassId]);

  // Current selected teacher object
  const currentTeacherObj = useMemo(() => {
    return teachers.find(t => String(t.id) === String(selectedTeacher)) || null;
  }, [teachers, selectedTeacher]);

  // Filtered rows for search and checkboxes
  const rows = useMemo(() => {
    if (!data?.rows) return [];
    const q = search.trim().toLowerCase();
    return data.rows.filter(r => {
      if (onlyBackdated && !(r.backdated > 0)) return false;
      if (onlyPaid && !r.hasPayment) return false;
      if (!q) return true;
      return (
        String(r.studentName || '').toLowerCase().includes(q) ||
        String(r.phone || '').includes(q) ||
        String(r.studentId || '').toLowerCase().includes(q)
      );
    });
  }, [data, search, onlyBackdated, onlyPaid]);

  const exportCsv = () => {
    if (!data) return;
    const classes = data.classes || [];
    const header = [
      'Student No',
      'Student Name',
      'Phone',
      'Card Type',
      ...classes.flatMap(c => [`${c.name} - This Month`, `${c.name} - Back-dated`]),
      'Total This Month',
      'Total Back-dated',
      'Back-dated Months Detail',
      'Real Income',
      'Advance (Info)'
    ];

    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [header.map(esc).join(',')];

    rows.forEach(r => {
      lines.push([
        r.studentId,
        r.studentName,
        r.phone,
        r.cardType,
        ...classes.flatMap(c => [
          r.classes[c.id]?.thisMonth || 0,
          r.classes[c.id]?.backdated || 0
        ]),
        r.thisMonth,
        r.backdated,
        r.backdatedMonths.map(b => `${b.month}: Rs. ${b.amount}`).join(' | '),
        r.income,
        r.advance
      ].map(esc).join(','));
    });

    // Summary line
    lines.push([
      '',
      `TOTAL (${rows.length} Students)`,
      '',
      '',
      ...classes.flatMap(c => [
        data.classTotals[c.id]?.thisMonth || 0,
        data.classTotals[c.id]?.backdated || 0
      ]),
      data.totals.thisMonth,
      data.totals.backdated,
      '',
      data.totals.income,
      data.totals.advance
    ].map(esc).join(','));

    const teacherNameClean = (data.teacher?.name || 'Teacher').replace(/[^a-zA-Z0-9_-]/g, '_');
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `testing-only-real-income-${teacherNameClean}-${cycle}.csv`;
    a.click();
  };

  if (allowed === false) {
    return (
      <div className="p-10 text-center text-slate-300">
        <AlertTriangle className="mx-auto mb-3 text-amber-400" size={32} />
        Testing Only — Real Income Matrix is only available to authorized staff.
      </div>
    );
  }

  return (
    <div className="p-2 md:p-6 text-slate-200 animate-fade-in max-w-full">
      {/* Header Banner */}
      <div className="rounded-3xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-amber-900/10 to-transparent p-5 mb-6 flex flex-wrap items-center gap-4 shadow-xl backdrop-blur-xl">
        <div className="p-3 bg-amber-500/20 border border-amber-500/30 rounded-2xl text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
          <FlaskConical size={26} />
        </div>
        <div className="flex-1 min-w-[240px]">
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
              Testing Only <span className="text-amber-400 text-xs px-2.5 py-0.5 rounded-full border border-amber-400/40 bg-amber-500/20 font-extrabold uppercase">Physical Matrix</span>
            </h1>
          </div>
          <p className="text-xs text-amber-100/80 mt-1 max-w-3xl leading-relaxed">
            Salary cycle = 1st – 30th/31st of the month, by payment date. Back-dated payments collected in this cycle for earlier months are credited as this cycle's Real Income with months specified. Regular class fee matrices and historical records remain untouched.
          </p>
        </div>
      </div>

      {/* Control Filters Bar */}
      <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4 mb-6 shadow-lg backdrop-blur-md flex flex-wrap items-center gap-3">
        {/* Teacher Selector */}
        <div className="flex flex-col gap-1 min-w-[220px] flex-1 sm:flex-initial">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Teacher / Lecturer</label>
          <select 
            value={selectedTeacher} 
            onChange={e => {
              setSelectedTeacher(e.target.value);
              setSelectedClassId('ALL');
            }} 
            className="bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-semibold outline-none focus:border-amber-400 transition-all cursor-pointer"
          >
            {teachers.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.classes?.length || 0} classes)
              </option>
            ))}
          </select>
        </div>

        {/* Cycle Month Selector */}
        <div className="flex flex-col gap-1 min-w-[150px]">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Cycle Month (1st – 30/31st)</label>
          <input 
            type="month" 
            value={cycle} 
            onChange={e => setCycle(e.target.value)} 
            className="bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-semibold outline-none focus:border-amber-400 transition-all cursor-pointer" 
          />
        </div>

        {/* Class Filter Dropdown */}
        <div className="flex flex-col gap-1 min-w-[180px]">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Class Columns View</label>
          <select 
            value={selectedClassId} 
            onChange={e => setSelectedClassId(e.target.value)} 
            className="bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-semibold outline-none focus:border-amber-400 transition-all cursor-pointer"
          >
            <option value="ALL">All Teacher's Classes ({currentTeacherObj?.classes?.length || 0} Columns)</option>
            {(currentTeacherObj?.classes || []).map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2 self-end mt-2 sm:mt-0">
          <button 
            type="button" 
            onClick={loadReport} 
            disabled={loading || !selectedTeacher} 
            className="bg-amber-600 hover:bg-amber-500 active:scale-95 disabled:opacity-50 text-white rounded-xl px-4 py-2.5 text-sm font-bold flex items-center gap-2 shadow-lg shadow-amber-600/20 transition-all cursor-pointer"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Calculating...' : 'Calculate'}</span>
          </button>

          {data && (
            <button 
              type="button" 
              onClick={exportCsv} 
              className="bg-slate-800 hover:bg-slate-700 border border-slate-600 active:scale-95 text-white rounded-xl px-4 py-2.5 text-sm font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <Download size={15} className="text-amber-400" />
              <span>Export CSV</span>
            </button>
          )}

          {data?.invoiceData && (
            <button 
              type="button" 
              onClick={() => setIsInvoiceOpen(true)} 
              className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl px-4 py-2.5 text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
              title="Generate and view official month-end salary slip voucher"
            >
              <FileText size={15} />
              <span>Generate Salary Slip</span>
            </button>
          )}
        </div>
      </div>

      {!data && !loading && (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-12 text-center text-slate-400">
          <FlaskConical className="mx-auto mb-3 text-amber-400/60" size={36} />
          <p className="text-base font-bold text-white">Select a Teacher and Cycle Month to view the Real Income Matrix.</p>
          <p className="text-xs text-slate-500 mt-1">Columns will automatically adapt to all classes conducted by the selected teacher.</p>
        </div>
      )}

      {loading && !data && (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-12 text-center text-slate-400">
          <RefreshCw className="mx-auto mb-3 text-amber-400 animate-spin" size={36} />
          <p className="text-base font-bold text-white">Analyzing physical class fee collections across date cycle...</p>
          <p className="text-xs text-slate-500 mt-1">Cross-referencing payment timestamps, on-time collections, and back-dated months.</p>
        </div>
      )}

      {data && (
        <>
          {/* Summary Metric Cards (Old Matrix removed, replaced with Net Teacher Payout) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <Card 
              label={`${data.cycle.label} share (This month)`} 
              value={data.totals.thisMonth}
              sub={`Fees for ${data.cycle.label} collected on/before cycle end`} 
            />
            <Card 
              label="Back-dated collected this cycle" 
              value={data.totals.backdated} 
              tone="purple"
              sub={`Net after Cut (${data.payout?.instituteCutPercent || 0}%): Rs. ${fmt(data.totals.backdatedNet !== undefined ? data.totals.backdatedNet : (data.totals.backdated * (1 - (data.payout?.instituteCutPercent || 0)/100)))} · ${data.backdatedByMonth.map(b => `${b.month}: Rs. ${fmt(b.amount)} (${b.students})`).join(' · ') || 'None'}`} 
            />
            <Card 
              label={`Real income · ${data.cycle.label}`} 
              value={data.totals.income} 
              tone="green" 
              sub="This Month + Back-dated collections" 
            />
            <Card 
              label="Net Lecturer Payout" 
              value={data.payout?.finalTeacherPayout || 0} 
              tone="amber"
              sub={`Gross: Rs. ${fmt(data.payout?.grossIncome || 0)} · Cut (${data.payout?.instituteCutPercent || 0}%): -Rs. ${fmt(data.payout?.instituteCutAmount || 0)}`} 
            />
          </div>

          {/* Teacher Payout Overview Banner */}
          {data.payout && (
            <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/30 via-slate-900/60 to-slate-900/40 p-4 mb-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-300">
                  <Percent size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Teacher Remuneration & Payout · {data.teacher.name}</h3>
                  <p className="text-xs text-slate-400">
                    Gross Real Income: <span className="font-bold text-white">Rs. {fmt(data.payout.grossIncome)}</span> (Regular: Rs. {fmt(data.totals.thisMonth)} + Late: Rs. {fmt(data.totals.backdated)})
                    {data.payout.instituteCutPercent > 0 && (
                      <> · Institute Cut ({data.payout.instituteCutPercent}%): <span className="font-bold text-rose-300">-Rs. {fmt(data.payout.instituteCutAmount)}</span> (Regular Cut: -Rs. {fmt(data.totals.thisMonthCut || (data.totals.thisMonth * data.payout.instituteCutPercent / 100))} + Late Cut: -Rs. {fmt(data.totals.backdatedCut || (data.totals.backdated * data.payout.instituteCutPercent / 100))})</>
                    )}
                    {data.payout.totalDeductions > 0 && (
                      <> · Advances & Deductions: <span className="font-bold text-rose-400">-Rs. {fmt(data.payout.totalDeductions)}</span></>
                    )}
                    {data.payout.totalAdditions > 0 && (
                      <> · Arrears Additions: <span className="font-bold text-emerald-400">+Rs. {fmt(data.payout.totalAdditions)}</span></>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase text-amber-400 tracking-widest">Net Payable Payout</span>
                  <p className="text-xl md:text-2xl font-black text-amber-300">Rs. {fmt(data.payout.finalTeacherPayout)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsInvoiceOpen(true)}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 px-4 py-2.5 rounded-xl font-black text-xs shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                >
                  <FileText size={15} />
                  <span>Salary Slip Voucher</span>
                </button>
              </div>
            </div>
          )}

          {/* Audit Pills */}
          <div className="flex flex-wrap gap-2 mb-4 text-[11px] font-semibold">
            <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300">
              Payments collected in cycle: <strong className="text-white">{data.paymentsApprovedInCycle.count}</strong> · Rs. {fmt(data.paymentsApprovedInCycle.amount)}
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300">
              Paid after cycle end for this month (moves to future cycle): <strong className="text-amber-300">Rs. {fmt(data.totals.lateForThisMonth)}</strong>
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300">
              Advance for future months (info only): <strong className="text-cyan-300">Rs. {fmt(data.totals.advance)}</strong>
            </span>
          </div>

          {/* Table Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3 bg-slate-900/60 border border-white/5 p-3 rounded-2xl">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-1.5">
                <Search size={14} className="text-slate-400" />
                <input 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                  placeholder="Search student / ID / phone..." 
                  className="bg-transparent text-sm text-white outline-none w-48 sm:w-64" 
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none text-slate-300 hover:text-white">
                <input 
                  type="checkbox" 
                  checked={onlyBackdated} 
                  onChange={e => setOnlyBackdated(e.target.checked)} 
                  className="rounded border-slate-700 accent-amber-500 cursor-pointer" 
                />
                <span>Only back-dated payments</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none text-slate-300 hover:text-white">
                <input 
                  type="checkbox" 
                  checked={onlyPaid} 
                  onChange={e => setOnlyPaid(e.target.checked)} 
                  className="rounded border-slate-700 accent-amber-500 cursor-pointer" 
                />
                <span>Only with payments / active</span>
              </label>
            </div>

            <div className="text-xs text-slate-400 font-bold">
              Showing <span className="text-amber-400">{rows.length}</span> students ({data.classes.length} class columns)
            </div>
          </div>

          {/* Matrix Table (WITHOUT Old Matrix Column) */}
          <div className="overflow-x-auto rounded-2xl border border-slate-700/80 bg-slate-950/80 max-h-[65vh] shadow-2xl relative">
            <table className="min-w-full text-xs text-left border-collapse">
              <thead className="bg-slate-900 sticky top-0 z-20 shadow-md">
                <tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-700">
                  <th className="px-3.5 py-3 min-w-[200px] sticky left-0 bg-slate-900 z-30 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                    Student Details
                  </th>
                  {data.classes.map(c => (
                    <th key={c.id} className="px-3.5 py-3 min-w-[170px] border-l border-slate-800">
                      <div className="font-black text-white truncate" title={c.name}>{c.name}</div>
                      <div className="text-[9px] text-amber-400/90 font-semibold mt-0.5">
                        {c.grade || ''} {c.subject ? `• ${c.subject}` : ''} {c.monthlyFee ? `• Fee: Rs. ${fmt(c.monthlyFee)}` : ''}
                      </div>
                    </th>
                  ))}
                  <th className="px-3.5 py-3 text-right min-w-[110px] border-l border-slate-800 text-slate-300">
                    This Month
                  </th>
                  <th className="px-3.5 py-3 text-right min-w-[130px] border-l border-slate-800 text-violet-300">
                    Back-dated
                  </th>
                  <th className="px-3.5 py-3 text-right min-w-[120px] border-l border-slate-800 text-emerald-300">
                    Real Income
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={data.classes.length + 4} className="px-6 py-10 text-center text-slate-500 font-bold">
                      No matching student payment records found for this cycle.
                    </td>
                  </tr>
                ) : (
                  rows.map(r => (
                    <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Student info sticky left */}
                      <td className="px-3.5 py-2.5 sticky left-0 bg-slate-950/95 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span className="truncate" title={r.studentName}>{r.studentName}</span>
                          {r.cardType === 'FREE' && (
                            <span className="px-1.5 py-0.2 text-[9px] rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">FREE</span>
                          )}
                          {r.cardType === 'HALF' && (
                            <span className="px-1.5 py-0.2 text-[9px] rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">HALF</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {r.studentId} {r.phone ? `• ${r.phone}` : ''}
                        </div>
                      </td>

                      {/* Class Columns (e.g. 5 columns if teacher has 5 classes) */}
                      {data.classes.map(c => {
                        const cell = r.classes[c.id] || {};
                        const hasThisMonth = cell.thisMonth > 0;
                        const isEnrolled = cell.isEnrolled;

                        return (
                          <td key={c.id} className="px-3.5 py-2.5 align-top border-l border-slate-800/80">
                            {hasThisMonth ? (
                              <p className="font-bold text-slate-200">Rs. {fmt(cell.thisMonth)}</p>
                            ) : (
                              <p className="text-slate-600 font-mono">{isEnrolled ? '—' : '—'}</p>
                            )}
                            
                            {/* Back-dated months mention */}
                            {(cell.backdatedMonths || []).map((b, bIdx) => {
                              const cutPct = data.payout?.instituteCutPercent || 0;
                              const netAmt = Math.round((Number(b.amount || 0) * (1 - cutPct / 100)) * 100) / 100;
                              return (
                                <p key={bIdx} className="text-[10px] text-violet-300 font-semibold flex items-center gap-1 mt-0.5" title={`Gross: Rs. ${fmt(b.amount)} | Cut (${cutPct}%): -Rs. ${fmt(b.amount - netAmt)} | Net: Rs. ${fmt(netAmt)}`}>
                                  <Undo2 size={9} className="text-violet-400 shrink-0" />
                                  <span>{b.month}: Rs. {fmt(b.amount)} {cutPct > 0 && <span className="text-[9px] text-amber-300/90 font-normal">(Net: Rs. {fmt(netAmt)})</span>}</span>
                                </p>
                              );
                            })}
                          </td>
                        );
                      })}

                      {/* Summary Columns (NO Old Matrix column) */}
                      <td className="px-3.5 py-2.5 text-right font-bold text-slate-300 border-l border-slate-800/80">
                        {r.thisMonth > 0 ? `Rs. ${fmt(r.thisMonth)}` : '—'}
                      </td>

                      <td className="px-3.5 py-2.5 text-right border-l border-slate-800/80 text-violet-300 font-bold">
                        {r.backdated > 0 ? (
                          <>
                            <p>Rs. {fmt(r.backdated)}</p>
                            {r.backdatedMonths.length > 0 && (
                              <p className="text-[9px] font-semibold text-violet-400/80">
                                {r.backdatedMonths.map(b => b.month).join(', ')}
                              </p>
                            )}
                          </>
                        ) : '—'}
                      </td>

                      <td className="px-3.5 py-2.5 text-right border-l border-slate-800/80 font-black text-emerald-300 text-[13px]">
                        Rs. {fmt(r.income)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {/* Sticky Footer Total Row */}
              <tfoot className="bg-slate-900 sticky bottom-0 z-20 shadow-[0_-2px_10px_rgba(0,0,0,0.5)]">
                <tr className="font-black border-t-2 border-slate-700 text-white">
                  <td className="px-3.5 py-3 sticky left-0 bg-slate-900 z-30 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                    TOTAL ({rows.length} Students)
                  </td>
                  {data.classes.map(c => {
                    const ct = data.classTotals[c.id] || {};
                    return (
                      <td key={c.id} className="px-3.5 py-3 align-top border-l border-slate-800">
                        <p className="text-slate-200">Rs. {fmt(ct.thisMonth)}</p>
                        {ct.backdated > 0 && (
                          <div className="text-[10px] text-violet-300 font-semibold mt-0.5">
                            <p>↩ Rs. {fmt(ct.backdated)}</p>
                            {ct.backdatedNet !== undefined && (
                              <p className="text-[9px] text-amber-300 font-normal">Net: Rs. {fmt(ct.backdatedNet)}</p>
                            )}
                          </div>
                        )}
                        <p className="text-[11px] font-black text-emerald-400 mt-1">
                          Σ Rs. {fmt(ct.income)}
                        </p>
                      </td>
                    );
                  })}
                  <td className="px-3.5 py-3 text-right border-l border-slate-800 text-slate-200">
                    Rs. {fmt(data.totals.thisMonth)}
                  </td>
                  <td className="px-3.5 py-3 text-right border-l border-slate-800 text-violet-300">
                    <p>Rs. {fmt(data.totals.backdated)}</p>
                    {data.totals.backdatedNet !== undefined && (
                      <p className="text-[10px] text-amber-300 font-normal">Net: Rs. {fmt(data.totals.backdatedNet)}</p>
                    )}
                  </td>
                  <td className="px-3.5 py-3 text-right border-l border-slate-800 text-emerald-300 text-sm">
                    Rs. {fmt(data.totals.income)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Month-End Official Salary Slip / Invoice Voucher Modal */}
          {data?.invoiceData && (
            <LecturerInvoiceModal
              isOpen={isInvoiceOpen}
              onClose={() => setIsInvoiceOpen(false)}
              reportData={data.invoiceData}
              selectedMonth={cycle}
              selectedClassId={selectedClassId}
              classesList={data.classes || []}
            />
          )}
        </>
      )}
    </div>
  );
}
