// 🔥 REAL INCOME (TESTING) 🔥
// Shows a salary cycle (1st – last day of a month) as REAL income:
//   This month    = Finance-Matrix share of THIS month, from payments approved up to the cycle end
//   Back-dated    = shares of EARLIER months, from payments approved INSIDE this cycle
//                   (e.g. September fee paid in November -> counted in November, labelled "Sep")
//   Income        = This month + Back-dated
// Advance shares (future months) stay with their own month and are shown for information only.
// The existing Finance Matrix / Teacher Salary are NOT changed: this re-runs the same matrix engine
// with an approval-date filter (internal hook req.__paymentFilter).
const prisma = require('../lib/prisma');
const financeController = require('./financeController');

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const SHORT = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const SINHALA = ['ජනවාරි', 'පෙබරවාරි', 'මාර්තු', 'අප්‍රේල්', 'මැයි', 'ජූනි', 'ජූලි', 'අගෝස්තු', 'සැප්තැම්බර්', 'ඔක්තෝම්බර්', 'නොවැම්බර්', 'දෙසැම්බර්'];

const monthIndexOf = (name) => {
    const s = String(name || '');
    for (let i = 0; i < 12; i++) if (s.includes(SINHALA[i])) return i;
    const l = s.toLowerCase();
    for (let i = 0; i < 12; i++) if (l.includes(MONTHS[i])) return i;
    for (let i = 0; i < 12; i++) if (new RegExp(`\\b${SHORT[i]}`).test(l)) return i;
    return -1;
};

// Midnight in Sri Lanka (UTC+05:30) as a UTC Date
const colomboMonthStart = (year, monthIdx) => new Date(Date.UTC(year, monthIdx, 1) - 330 * 60 * 1000);
const absOf = (date) => {
    const d = new Date(new Date(date).getTime() + 330 * 60 * 1000); // shift to Colombo
    return d.getUTCFullYear() * 12 + d.getUTCMonth();
};
const keyOfAbs = (abs) => `${Math.floor(abs / 12)}-${String((abs % 12) + 1).padStart(2, '0')}`;
const labelOfAbs = (abs) => `${MONTHS[abs % 12].slice(0, 1).toUpperCase()}${MONTHS[abs % 12].slice(1, 3)} ${Math.floor(abs / 12)}`;

const MANAGER_WORDS = ['MANAGER', 'HEAD'];
const canViewRealIncome = async (user) => {
    if (!user) return false;
    const role = String(user.role || '').toUpperCase().replace(/ /g, '_');
    const dept = String(user.department || '').toUpperCase();
    if (['SYSTEM_ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'SUPER', 'ADMIN'].includes(role)) return true;
    if (dept === 'FINANCE' && MANAGER_WORDS.some(w => role.includes(w))) return true;
    // Extra testers: AppSetting REAL_INCOME_TESTERS = "12,45"
    try {
        const s = await prisma.appSetting.findUnique({ where: { key: 'REAL_INCOME_TESTERS' } });
        const ids = String(s?.value || '').split(',').map(x => parseInt(x.trim())).filter(n => !isNaN(n));
        const uid = parseInt(user.id || user.userId);
        if (ids.includes(uid)) return true;
    } catch (e) { /* ignore */ }
    return false;
};

// Payment approval time: approvedAt, or (old payments) last update time as an approximation
const approvalTime = (p) => {
    if (p.approvedAt) return new Date(p.approvedAt);
    if (parseInt(p.status) === 1) return new Date(p.updatedAt || p.created_at);
    return null;
};

const runMatrix = async (req, filterFn) => {
    let code = 200;
    let data = null;
    const fakeRes = {
        status: (c) => { code = c; return fakeRes; },
        json: (d) => { data = d; return fakeRes; }
    };
    const fakeReq = { query: { ...req.query }, user: req.user, __paymentFilter: filterFn || null };
    await financeController.getFinanceMatrix(fakeReq, fakeRes);
    if (code >= 400) {
        const err = new Error(data?.error || 'Finance matrix failed');
        err.status = code;
        throw err;
    }
    return data;
};

// Give every monthly group a real calendar month (group names have no year).
// Groups are already in chronological order; the year is chosen so that the groups line up
// best with when students actually paid their monthly fees.
const assignCalendarMonths = async (months, batchId, cycleAbs) => {
    const idx = months.map(m => monthIndexOf(m.name));
    const offsets = [];
    let off = 0;
    let prev = null;
    idx.forEach((mi, i) => {
        if (mi < 0) { offsets.push(null); return; }
        if (prev === null) off = 0;
        else {
            let d = (mi - prev + 12) % 12;
            if (d === 0) d = 12;
            off += d;
        }
        offsets.push(off);
        prev = mi;
    });
    const firstIdx = idx.find(x => x >= 0);
    if (firstIdx === undefined) return months.map(() => null);

    // Evidence: median created_at of approved MONTHLY payments per group
    const ids = months.map(m => m.id);
    const pays = await prisma.payment.findMany({
        where: { batchId: parseInt(batchId), status: 1, payment_type: 1, groupId: { in: ids } },
        select: { groupId: true, created_at: true }
    });
    const byGroup = {};
    pays.forEach(p => { (byGroup[p.groupId] = byGroup[p.groupId] || []).push(absOf(p.created_at)); });
    const median = (arr) => { const s = [...arr].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

    const cycleYear = Math.floor(cycleAbs / 12);
    let best = null;
    for (let y = cycleYear - 3; y <= cycleYear + 1; y++) {
        const baseAbs = y * 12 + firstIdx;
        let score = 0, n = 0;
        months.forEach((m, i) => {
            if (offsets[i] === null || !byGroup[m.id]) return;
            score += Math.abs(baseAbs + offsets[i] - median(byGroup[m.id]));
            n++;
        });
        if (n === 0) {
            // No evidence: put the batch so that it covers the cycle month if possible
            const lastAbs = baseAbs + Math.max(...offsets.filter(o => o !== null));
            score = (cycleAbs >= baseAbs && cycleAbs <= lastAbs) ? 0 : Math.min(Math.abs(cycleAbs - baseAbs), Math.abs(cycleAbs - lastAbs));
        }
        if (!best || score < best.score) best = { y, score, baseAbs };
    }
    return months.map((m, i) => (offsets[i] === null ? null : best.baseAbs + offsets[i]));
};

const cell = (stu, groupId, sub) => stu?.matrixValues?.[groupId]?.[sub] || null;
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// GET /api/finance/real-income?businessId=&batchId=&classType=1&cycle=2026-11
exports.getRealIncome = async (req, res) => {
    try {
        if (!(await canViewRealIncome(req.user))) {
            return res.status(403).json({ error: 'Real Income (TESTING) is only available to the Finance Manager.' });
        }
        const { batchId, cycle } = req.query;
        if (!batchId || batchId === 'null') return res.status(400).json({ error: 'Batch ID is required' });
        if (!/^\d{4}-\d{2}$/.test(String(cycle || ''))) return res.status(400).json({ error: 'cycle must be YYYY-MM' });

        const [cy, cm] = cycle.split('-').map(Number);
        const cycleAbs = cy * 12 + (cm - 1);
        const start = colomboMonthStart(cy, cm - 1);
        const end = colomboMonthStart(cm === 12 ? cy + 1 : cy, cm === 12 ? 0 : cm);

        const [fullM, endM, startM] = await Promise.all([
            runMatrix(req, null),
            runMatrix(req, (p) => { const t = approvalTime(p); return t && t < end; }),
            runMatrix(req, (p) => { const t = approvalTime(p); return t && t < start; })
        ]);

        const months = fullM.months || [];
        const subjects = fullM.subjects || [];
        const absList = await assignCalendarMonths(months, batchId, cycleAbs);
        const monthInfo = months.map((m, i) => ({ id: m.id, name: m.name, abs: absList[i], key: absList[i] !== null ? keyOfAbs(absList[i]) : null, label: absList[i] !== null ? labelOfAbs(absList[i]) : m.name }));
        const current = monthInfo.find(m => m.abs === cycleAbs) || null;

        const mapById = (data) => {
            const map = new Map();
            (data?.students || []).forEach(s => map.set(s.id, s));
            return map;
        };
        const fullS = mapById(fullM), endS = mapById(endM), startS = mapById(startM);
        const allIds = new Set([...fullS.keys(), ...endS.keys()]);

        const totals = { thisMonth: 0, backdated: 0, income: 0, advance: 0, oldMatrixMonth: 0, lateForThisMonth: 0 };
        const backdatedByMonth = {};
        const subjectTotals = {};
        subjects.forEach(sub => { subjectTotals[sub] = { thisMonth: 0, backdated: 0, income: 0 }; });

        const rows = [];
        allIds.forEach(id => {
            const fs = fullS.get(id), es = endS.get(id), ss = startS.get(id);
            const base = fs || es;
            const row = {
                id, studentNo: base?.studentNo, studentName: base?.studentName, phone: base?.phone, type: base?.type || null,
                subjects: {}, thisMonth: 0, backdated: 0, income: 0, advance: 0, oldMatrixMonth: 0, backdatedMonths: []
            };
            const bdMonthsForRow = new Map();

            subjects.forEach(sub => {
                const sc = { thisMonth: 0, backdated: 0, income: 0, oldMatrix: 0, backdatedMonths: [] };
                if (current) {
                    sc.thisMonth = r2(cell(es, current.id, sub)?.total || 0);
                    sc.oldMatrix = r2(cell(fs, current.id, sub)?.total || 0);
                }
                monthInfo.forEach(mi => {
                    if (mi.abs === null) return;
                    const delta = (cell(es, mi.id, sub)?.total || 0) - (cell(ss, mi.id, sub)?.total || 0);
                    if (Math.abs(delta) < 0.5) return;
                    if (mi.abs < cycleAbs) {
                        sc.backdated += delta;
                        sc.backdatedMonths.push({ month: mi.label, amount: r2(delta) });
                        bdMonthsForRow.set(mi.label, (bdMonthsForRow.get(mi.label) || 0) + delta);
                        backdatedByMonth[mi.label] = backdatedByMonth[mi.label] || { month: mi.label, abs: mi.abs, amount: 0, students: new Set() };
                        backdatedByMonth[mi.label].amount += delta;
                        backdatedByMonth[mi.label].students.add(id);
                    } else if (mi.abs > cycleAbs) {
                        row.advance += delta;
                    }
                });
                sc.backdated = r2(sc.backdated);
                sc.income = r2(sc.thisMonth + sc.backdated);
                row.subjects[sub] = sc;
                row.thisMonth += sc.thisMonth;
                row.backdated += sc.backdated;
                row.oldMatrixMonth += sc.oldMatrix;
                subjectTotals[sub].thisMonth += sc.thisMonth;
                subjectTotals[sub].backdated += sc.backdated;
                subjectTotals[sub].income += sc.income;
            });

            row.thisMonth = r2(row.thisMonth);
            row.backdated = r2(row.backdated);
            row.income = r2(row.thisMonth + row.backdated);
            row.advance = r2(row.advance);
            row.oldMatrixMonth = r2(row.oldMatrixMonth);
            row.backdatedMonths = Array.from(bdMonthsForRow.entries()).map(([month, amount]) => ({ month, amount: r2(amount) }));

            if (row.income !== 0 || row.oldMatrixMonth !== 0 || row.advance !== 0) {
                rows.push(row);
                totals.thisMonth += row.thisMonth;
                totals.backdated += row.backdated;
                totals.advance += row.advance;
                totals.oldMatrixMonth += row.oldMatrixMonth;
            }
        });

        totals.thisMonth = r2(totals.thisMonth);
        totals.backdated = r2(totals.backdated);
        totals.income = r2(totals.thisMonth + totals.backdated);
        totals.advance = r2(totals.advance);
        totals.oldMatrixMonth = r2(totals.oldMatrixMonth);
        // Shares of THIS month approved AFTER the cycle ended (they will appear as back-dated in a later cycle)
        totals.lateForThisMonth = r2(totals.oldMatrixMonth - totals.thisMonth);
        Object.values(subjectTotals).forEach(t => { t.thisMonth = r2(t.thisMonth); t.backdated = r2(t.backdated); t.income = r2(t.income); });

        // Payments approved inside the cycle (audit list) + how many used an approximate approval time
        const cyclePayments = await prisma.payment.findMany({
            where: { batchId: parseInt(batchId), status: 1 },
            select: { id: true, amount: true, approvedAt: true, updatedAt: true, created_at: true, status: true, payment_type: true, groupId: true, studentId: true }
        });
        const inCycle = cyclePayments.filter(p => { const t = approvalTime(p); return t && t >= start && t < end; });
        const approximated = inCycle.filter(p => !p.approvedAt).length;

        rows.sort((a, b) => (b.backdated - a.backdated) || (b.income - a.income));

        res.status(200).json({
            testing: true,
            cycle: { key: cycle, label: labelOfAbs(cycleAbs), start, end },
            currentMonthGroup: current,
            months: monthInfo,
            subjects,
            subjectTotals,
            totals,
            backdatedByMonth: Object.values(backdatedByMonth)
                .sort((a, b) => a.abs - b.abs)
                .map(b => ({ month: b.month, amount: r2(b.amount), students: b.students.size })),
            paymentsApprovedInCycle: { count: inCycle.length, amount: r2(inCycle.reduce((s, p) => s + (p.amount || 0), 0)), approximatedApprovalTime: approximated },
            rows
        });
    } catch (error) {
        console.error('Real Income error:', error);
        res.status(error.status || 500).json({ error: error.message || 'Failed to build Real Income report' });
    }
};

// GET /api/finance/real-income/access  -> { allowed }
exports.checkAccess = async (req, res) => {
    res.status(200).json({ allowed: await canViewRealIncome(req.user) });
};