// 🔥 REAL INCOME (TESTING) — PHYSICAL HUB 🔥
// Teacher-wise & Class-wise Real Income Matrix
// Salary cycle = 1st to last day of the month (1 - 30 / 1 - 31), by payment date (Colombo UTC+05:30).
// This month  = fee for this cycle month paid on or before cycle end.
// Back-dated  = fee for earlier months (month < cycle) paid INSIDE this cycle.
// Real Income = This month + Back-dated.
// Advance     = fee for future months (month > cycle) paid before cycle end (shown for info).
// Old Matrix  = fee for this cycle month regardless of payment date.

const prisma = require('../lib/prisma');

const colomboMonthStart = (year, monthIdx) => new Date(Date.UTC(year, monthIdx, 1) - 330 * 60 * 1000);

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const getPaidDate = (p) => {
    if (p.paidDate) return new Date(p.paidDate);
    if (p.updatedAt) return new Date(p.updatedAt);
    if (p.createdAt) return new Date(p.createdAt);
    return null;
};

const PAYOUT_ADDITION_CATEGORIES = ['late payment', 'addition', 'payout addition', 'arrears', 'due addition'];

// Check permission to view physical real income
const canViewPhysicalRealIncome = async (user) => {
    if (!user) return false;
    const role = String(user.role || '').toUpperCase().replace(/ /g, '_');
    const dept = String(user.department || '').toUpperCase();
    if (['SYSTEM_ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'SUPER', 'ADMIN'].includes(role)) return true;
    if (dept === 'FINANCE' || dept === 'PHYSICAL') return true;
    return true;
};

// GET /api/physical-crm/real-income?teacherId=&cycle=YYYY-MM&classId=ALL
exports.getPhysicalRealIncome = async (req, res) => {
    try {
        if (!(await canViewPhysicalRealIncome(req.user))) {
            return res.status(403).json({ error: 'Real Income (TESTING) is only available to authorized staff.' });
        }

        const { teacherId, cycle, classId } = req.query;
        if (!teacherId) {
            return res.status(400).json({ error: 'Teacher ID is required' });
        }
        if (!/^\d{4}-\d{2}$/.test(String(cycle || ''))) {
            return res.status(400).json({ error: 'cycle must be YYYY-MM' });
        }

        const tId = parseInt(teacherId);
        const teacher = await prisma.physicalTeacher.findUnique({
            where: { id: tId },
            include: {
                classes: {
                    orderBy: { id: 'asc' }
                }
            }
        });

        if (!teacher) {
            return res.status(404).json({ error: 'Teacher not found' });
        }

        // Classes belonging to this teacher
        let relevantClasses = teacher.classes || [];
        if (classId && classId !== 'ALL') {
            relevantClasses = relevantClasses.filter(c => c.id === parseInt(classId));
        }

        const classIds = relevantClasses.map(c => c.id);

        // Date cycle: 1st of cycle month 00:00:00 to last day 23:59:59.999 (Colombo time)
        const [cy, cm] = cycle.split('-').map(Number);
        const start = colomboMonthStart(cy, cm - 1);
        const end = colomboMonthStart(cm === 12 ? cy + 1 : cy, cm === 12 ? 0 : cm);

        // Month label
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const cycleLabel = `${monthNames[cm - 1]} ${cy}`;

        if (classIds.length === 0) {
            return res.status(200).json({
                testing: true,
                teacher: {
                    id: teacher.id,
                    name: teacher.name,
                    image: teacher.image,
                    instituteCut: teacher.instituteCut || 0
                },
                cycle: { key: cycle, label: cycleLabel, start, end },
                classes: [],
                classTotals: {},
                totals: { thisMonth: 0, backdated: 0, income: 0, advance: 0, oldMatrixMonth: 0, lateForThisMonth: 0 },
                payout: { grossIncome: 0, instituteCutPercent: 0, instituteCutAmount: 0, netPayoutBeforeDeductions: 0, totalAdditions: 0, totalDeductions: 0, finalTeacherPayout: 0 },
                backdatedByMonth: [],
                paymentsApprovedInCycle: { count: 0, amount: 0 },
                rows: []
            });
        }

        // Fetch Enrollments for these classes
        const enrollments = await prisma.physicalStudentClassEnrollment.findMany({
            where: { classId: { in: classIds } },
            include: {
                student: { include: { school: true } },
                class: true
            }
        });

        // Primary students assigned directly to these classes
        const primaryStudents = await prisma.physicalStudent.findMany({
            where: { classId: { in: classIds } },
            include: { school: true, class: true }
        });

        // All fee payments for these classes
        const payments = await prisma.physicalClassFeePayment.findMany({
            where: {
                classId: { in: classIds },
                status: { in: ['PAID', 'HALF_PAYMENT', 'PARTIAL'] }
            },
            include: {
                student: { include: { school: true } },
                class: true
            }
        });

        // Map of all distinct students
        const studentMap = new Map();
        const addStudent = (s, enrolledClassId = null) => {
            if (!s || !s.id) return;
            if (!studentMap.has(s.id)) {
                studentMap.set(s.id, {
                    id: s.id,
                    studentId: s.studentId || '',
                    studentName: s.studentName || `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Unknown Student',
                    phone: s.phone || s.whatsapp || s.guardianPhone || '',
                    school: s.school ? s.school.name : '',
                    cardType: s.cardType || 'FULL',
                    enrolledClassIds: new Set()
                });
            }
            if (enrolledClassId) {
                studentMap.get(s.id).enrolledClassIds.add(enrolledClassId);
            }
        };

        enrollments.forEach(e => addStudent(e.student, e.classId));
        primaryStudents.forEach(s => addStudent(s, s.classId));
        payments.forEach(p => addStudent(p.student, null));

        // Group payments by `${studentId}_${classId}`
        const paymentsByStudentClass = new Map();
        payments.forEach(p => {
            const key = `${p.studentId}_${p.classId}`;
            if (!paymentsByStudentClass.has(key)) {
                paymentsByStudentClass.set(key, []);
            }
            paymentsByStudentClass.get(key).push(p);
        });

        const totals = {
            thisMonth: 0,
            backdated: 0,
            income: 0,
            advance: 0,
            oldMatrixMonth: 0,
            lateForThisMonth: 0
        };

        const backdatedByMonth = {};
        const classTotals = {};
        relevantClasses.forEach(cls => {
            classTotals[cls.id] = {
                classId: cls.id,
                className: cls.name,
                thisMonth: 0,
                backdated: 0,
                income: 0,
                oldMatrix: 0,
                advance: 0
            };
        });

        const rows = [];
        studentMap.forEach(st => {
            const row = {
                id: st.id,
                studentId: st.studentId,
                studentName: st.studentName,
                phone: st.phone,
                school: st.school,
                cardType: st.cardType,
                classes: {},
                thisMonth: 0,
                backdated: 0,
                income: 0,
                advance: 0,
                oldMatrixMonth: 0,
                backdatedMonths: [],
                hasPayment: false,
                isEnrolledAny: st.enrolledClassIds.size > 0
            };

            const bdMonthsForRow = new Map();

            relevantClasses.forEach(cls => {
                const isEnrolled = st.enrolledClassIds.has(cls.id);
                const studentClassPayments = paymentsByStudentClass.get(`${st.id}_${cls.id}`) || [];

                const cData = {
                    classId: cls.id,
                    className: cls.name,
                    isEnrolled,
                    thisMonth: 0,
                    backdated: 0,
                    income: 0,
                    oldMatrix: 0,
                    advance: 0,
                    backdatedMonths: []
                };

                studentClassPayments.forEach(p => {
                    const amt = Number(p.amount) || 0;
                    if (amt <= 0) return;
                    const pDate = getPaidDate(p);
                    if (!pDate) return;

                    const pMonth = String(p.month || '').trim();

                    // 1. Fee for THIS cycle month
                    if (pMonth === cycle) {
                        cData.oldMatrix += amt;
                        if (pDate < end) {
                            cData.thisMonth += amt;
                        }
                    }
                    // 2. Fee for EARLIER month (back-dated / late payment)
                    else if (pMonth < cycle) {
                        if (pDate >= start && pDate < end) {
                            cData.backdated += amt;
                            cData.backdatedMonths.push({ month: pMonth, amount: r2(amt), paidDate: pDate });

                            bdMonthsForRow.set(pMonth, (bdMonthsForRow.get(pMonth) || 0) + amt);

                            if (!backdatedByMonth[pMonth]) {
                                backdatedByMonth[pMonth] = { month: pMonth, amount: 0, students: new Set() };
                            }
                            backdatedByMonth[pMonth].amount += amt;
                            backdatedByMonth[pMonth].students.add(st.id);
                        }
                    }
                    // 3. Fee for FUTURE month (advance)
                    else if (pMonth > cycle) {
                        if (pDate < end) {
                            cData.advance += amt;
                        }
                    }
                });

                cData.thisMonth = r2(cData.thisMonth);
                cData.backdated = r2(cData.backdated);
                cData.income = r2(cData.thisMonth + cData.backdated);
                cData.oldMatrix = r2(cData.oldMatrix);
                cData.advance = r2(cData.advance);

                row.classes[cls.id] = cData;

                row.thisMonth += cData.thisMonth;
                row.backdated += cData.backdated;
                row.oldMatrixMonth += cData.oldMatrix;
                row.advance += cData.advance;

                classTotals[cls.id].thisMonth += cData.thisMonth;
                classTotals[cls.id].backdated += cData.backdated;
                classTotals[cls.id].income += cData.income;
                classTotals[cls.id].oldMatrix += cData.oldMatrix;
                classTotals[cls.id].advance += cData.advance;
            });

            row.thisMonth = r2(row.thisMonth);
            row.backdated = r2(row.backdated);
            row.income = r2(row.thisMonth + row.backdated);
            row.oldMatrixMonth = r2(row.oldMatrixMonth);
            row.advance = r2(row.advance);
            row.hasPayment = (row.income > 0 || row.oldMatrixMonth > 0 || row.advance > 0);

            row.backdatedMonths = Array.from(bdMonthsForRow.entries()).map(([month, amount]) => ({
                month,
                amount: r2(amount)
            })).sort((a, b) => b.month.localeCompare(a.month));

            rows.push(row);

            totals.thisMonth += row.thisMonth;
            totals.backdated += row.backdated;
            totals.advance += row.advance;
            totals.oldMatrixMonth += row.oldMatrixMonth;
        });

        totals.thisMonth = r2(totals.thisMonth);
        totals.backdated = r2(totals.backdated);
        totals.income = r2(totals.thisMonth + totals.backdated);
        totals.advance = r2(totals.advance);
        totals.oldMatrixMonth = r2(totals.oldMatrixMonth);
        totals.lateForThisMonth = r2(totals.oldMatrixMonth - totals.thisMonth);

        Object.values(classTotals).forEach(ct => {
            ct.thisMonth = r2(ct.thisMonth);
            ct.backdated = r2(ct.backdated);
            ct.income = r2(ct.thisMonth + ct.backdated);
            ct.oldMatrix = r2(ct.oldMatrix);
            ct.advance = r2(ct.advance);
        });

        // Teacher payout & institute cut calculations (deducting institute cut from BOTH regular and late fees)
        const instituteCutPct = Number(teacher.instituteCut) || 0;
        const instituteCutAmt = r2((totals.income * instituteCutPct) / 100);
        const thisMonthCut = r2((totals.thisMonth * instituteCutPct) / 100);
        const thisMonthNet = r2(totals.thisMonth - thisMonthCut);
        const backdatedCut = r2((totals.backdated * instituteCutPct) / 100);
        const backdatedNet = r2(totals.backdated - backdatedCut);
        const netPayoutBeforeTxns = r2(totals.income - instituteCutAmt);

        totals.thisMonthCut = thisMonthCut;
        totals.thisMonthNet = thisMonthNet;
        totals.backdatedCut = backdatedCut;
        totals.backdatedNet = backdatedNet;
        totals.instituteCutAmount = instituteCutAmt;
        totals.netIncome = netPayoutBeforeTxns;

        Object.values(classTotals).forEach(ct => {
            ct.thisMonth = r2(ct.thisMonth);
            ct.thisMonthCut = r2((ct.thisMonth * instituteCutPct) / 100);
            ct.thisMonthNet = r2(ct.thisMonth - ct.thisMonthCut);
            ct.backdated = r2(ct.backdated);
            ct.backdatedCut = r2((ct.backdated * instituteCutPct) / 100);
            ct.backdatedNet = r2(ct.backdated - ct.backdatedCut);
            ct.income = r2(ct.thisMonth + ct.backdated);
            ct.incomeCut = r2((ct.income * instituteCutPct) / 100);
            ct.netTeacherPayout = r2(ct.income - ct.incomeCut);
            ct.oldMatrix = r2(ct.oldMatrix);
            ct.advance = r2(ct.advance);
        });

        // Payments collected inside the cycle
        const paymentsInCycle = payments.filter(p => {
            const pd = getPaidDate(p);
            return pd && pd >= start && pd < end;
        });
        const paymentsInCycleAmount = r2(paymentsInCycle.reduce((s, p) => s + (p.amount || 0), 0));

        // Teacher transactions for this cycle
        const teacherTxns = await prisma.physicalTransaction.findMany({
            where: {
                teacherId: teacher.id,
                isDeleted: false,
                OR: [
                    { billingMonth: cycle },
                    {
                        AND: [
                            { billingMonth: null },
                            { date: { gte: start, lte: end } }
                        ]
                    }
                ]
            }
        });

        let totalTeacherAdvances = 0;
        let totalInstituteIncomeDeductions = 0;
        let totalAdditions = 0;

        teacherTxns.forEach(t => {
            const amt = Number(t.amount) || 0;
            const cat = String(t.category || '').trim().toLowerCase();
            if (PAYOUT_ADDITION_CATEGORIES.includes(cat)) {
                totalAdditions += amt;
            } else if (t.type === 'INCOME') {
                totalInstituteIncomeDeductions += amt;
            } else {
                totalTeacherAdvances += amt;
            }
        });

        const totalDeductions = r2(totalTeacherAdvances + totalInstituteIncomeDeductions);
        const finalTeacherPayout = r2(Math.max(0, netPayoutBeforeTxns + totalAdditions - totalDeductions));

        // Sort rows by backdated descending, then income descending
        rows.sort((a, b) => (b.backdated - a.backdated) || (b.income - a.income) || (b.oldMatrixMonth - a.oldMatrixMonth));

        // Construct Late Fee Collections for Invoice Voucher with Institute Cut deducted
        const lateFeePayments = payments.filter(p => {
            const pMonth = String(p.month || '').trim();
            const pd = getPaidDate(p);
            return pMonth < cycle && pd && pd >= start && pd < end;
        });

        const lateFeeCollections = lateFeePayments.map(p => {
            const amt = Number(p.amount) || 0;
            const cutAmt = r2((amt * instituteCutPct) / 100);
            const netAmt = r2(amt - cutAmt);
            return {
                id: p.id,
                classId: p.classId,
                className: p.class?.name || '',
                studentName: p.student?.studentName || `${p.student?.firstName || ''} ${p.student?.lastName || ''}`.trim() || 'Student',
                studentRegId: p.student?.studentId || '',
                feeMonth: p.month,
                paidDate: p.paidDate || p.updatedAt || p.createdAt,
                amount: amt,
                grossAmount: amt,
                instituteCutPercent: instituteCutPct,
                instituteCutAmount: cutAmt,
                netAmount: netAmt,
                status: p.status,
                paymentMethod: p.paymentMethod || 'CASH'
            };
        });

        // Format classes specifically for the official LecturerInvoiceModal
        const invoiceClasses = relevantClasses.map(cls => {
            const ct = classTotals[cls.id] || {};
            const enrolledCount = rows.filter(r => r.classes[cls.id]?.isEnrolled).length;
            const regularPaidCount = rows.filter(r => (r.classes[cls.id]?.thisMonth || 0) > 0).length;
            const lateFeePaidCount = rows.filter(r => (r.classes[cls.id]?.backdated || 0) > 0).length;
            const clsCutAmt = r2((ct.income * instituteCutPct) / 100);
            return {
                classId: cls.id,
                className: cls.name,
                grade: cls.grade,
                subject: cls.subject,
                monthlyFee: cls.monthlyFee || 0,
                enrolledCount,
                regularPaidCount,
                paidCount: regularPaidCount,
                grossRevenue: ct.income,
                regularGrossRevenue: ct.thisMonth,
                regularInstituteCutAmount: ct.thisMonthCut,
                regularNetRevenue: ct.thisMonthNet,
                lateFeeGrossRevenue: ct.backdated,
                lateFeeInstituteCutAmount: ct.backdatedCut,
                lateFeeNetRevenue: ct.backdatedNet,
                lateFeePaidCount,
                instituteCutPercent: instituteCutPct,
                instituteCutAmount: clsCutAmt,
                netTeacherPayout: r2(ct.income - clsCutAmt)
            };
        });

        // Official Salary Slip / Invoice Voucher data matching LecturerInvoiceModal schema
        const invoiceData = {
            teacher: {
                id: teacher.id,
                name: teacher.name,
                lecturerId: teacher.lecturerId || `IMA-LEC-${teacher.id}`,
                phone: teacher.phone || '',
                whatsapp: teacher.whatsapp || '',
                image: teacher.image,
                instituteCut: instituteCutPct
            },
            summary: {
                grossRevenue: totals.income,
                regularGrossRevenue: totals.thisMonth,
                regularInstituteCutAmount: thisMonthCut,
                regularNetRevenue: thisMonthNet,
                lateFeeGrossRevenue: totals.backdated,
                lateFeeInstituteCutAmount: backdatedCut,
                lateFeeNetRevenue: backdatedNet,
                instituteCutAmount: instituteCutAmt,
                netTeacherPayoutBeforeDeductions: netPayoutBeforeTxns,
                totalAdditions: r2(totalAdditions),
                totalDeductions: r2(totalDeductions),
                netTeacherPayout: finalTeacherPayout,
                totalEnrolledStudents: rows.filter(r => r.isEnrolledAny).length,
                totalPaidStudents: rows.filter(r => r.thisMonth > 0).length,
                lateFeePaidCount: lateFeePayments.length
            },
            classes: invoiceClasses,
            lateFeeCollections,
            deductions: teacherTxns.map(t => ({
                id: t.id,
                title: t.category || t.description || 'Adjustment',
                description: t.description || t.category || '',
                amount: Number(t.amount) || 0,
                type: t.type,
                category: t.category,
                date: t.date
            }))
        };

        res.status(200).json({
            testing: true,
            teacher: {
                id: teacher.id,
                name: teacher.name,
                lecturerId: teacher.lecturerId,
                phone: teacher.phone,
                image: teacher.image,
                instituteCut: instituteCutPct
            },
            cycle: {
                key: cycle,
                label: cycleLabel,
                start,
                end
            },
            classes: relevantClasses.map(c => ({
                id: c.id,
                name: c.name,
                grade: c.grade,
                subject: c.subject,
                monthlyFee: c.monthlyFee || 0
            })),
            classTotals,
            totals,
            payout: {
                grossIncome: totals.income,
                instituteCutPercent: instituteCutPct,
                instituteCutAmount: instituteCutAmt,
                netPayoutBeforeDeductions: netPayoutBeforeTxns,
                totalAdditions: r2(totalAdditions),
                totalDeductions: r2(totalDeductions),
                finalTeacherPayout
            },
            invoiceData,
            backdatedByMonth: Object.values(backdatedByMonth)
                .sort((a, b) => b.month.localeCompare(a.month))
                .map(b => ({
                    month: b.month,
                    amount: r2(b.amount),
                    students: b.students.size
                })),
            paymentsApprovedInCycle: {
                count: paymentsInCycle.length,
                amount: paymentsInCycleAmount
            },
            rows
        });
    } catch (error) {
        console.error('[Physical Real Income] Error:', error);
        res.status(error.status || 500).json({ error: error.message || 'Failed to calculate Physical Real Income report' });
    }
};

// GET /api/physical-crm/real-income/access
exports.checkAccess = async (req, res) => {
    res.status(200).json({ allowed: await canViewPhysicalRealIncome(req.user) });
};
