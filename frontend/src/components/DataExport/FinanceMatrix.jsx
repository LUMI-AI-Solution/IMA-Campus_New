import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { Loader2, AlertCircle, ChevronDown, TrendingUp, ChevronLeft, ChevronRight, Search, Download } from 'lucide-react';

export default function FinanceMatrix({ loggedInUser }) {
    const roleUpper = loggedInUser?.role ? String(loggedInUser.role).toUpperCase().replace(/[\s_-]+/g, '_') : '';
    const deptUpper = loggedInUser?.department ? String(loggedInUser.department).toUpperCase().replace(/[\s_-]+/g, '_') : '';
    const isSystemAdmin = ['SYSTEM_ADMIN', 'DIRECTOR', 'SUPER_ADMIN', 'ADMIN'].includes(roleUpper);
    const isFinanceDept = deptUpper === 'FINANCE' || roleUpper === 'FINANCE';
    const canSeeAllBusinesses = isSystemAdmin || isFinanceDept;

    const [businesses, setBusinesses] = useState([]);
    const [batches, setBatches] = useState([]);
    const [selectedBiz, setSelectedBiz] = useState(canSeeAllBusinesses ? '' : loggedInUser?.businessId || '');
    const [selectedBatch, setSelectedBatch] = useState('');

    const [searchTerm, setSearchTerm] = useState('');
    const [enrollmentFilter, setEnrollmentFilter] = useState('ALL');
    const [currentMonthIndex, setCurrentMonthIndex] = useState(0);

    const [months, setMonths] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [studentsData, setStudentsData] = useState([]);
    const [grandTotal, setGrandTotal] = useState(0);

    const [visibleCount, setVisibleCount] = useState(50);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchInitialBiz = async () => {
            try {
                const bizRes = await axios.get('/admin/businesses');
                const fetchedBiz = bizRes.data?.businesses || bizRes.data || [];
                setBusinesses(fetchedBiz);
                if (fetchedBiz.length === 1) {
                    setSelectedBiz(fetchedBiz[0].id.toString());
                    fetchBatches(fetchedBiz[0].id.toString());
                } else if (selectedBiz) {
                    fetchBatches(selectedBiz);
                }
            } catch (e) { console.error(e); }
        };
        fetchInitialBiz();
    }, [canSeeAllBusinesses]); // Removed selectedBiz from dependency to prevent infinite loop or over-fetching

    useEffect(() => {
        if (selectedBiz) {
            fetchBatches(selectedBiz);
            setSelectedBatch('');
            resetMatrix();
        }
    }, [selectedBiz]);

    useEffect(() => {
        if (selectedBiz && selectedBatch) {
            fetchFinanceMatrixData();
        } else {
            resetMatrix();
        }
    }, [selectedBatch]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
            if (months.length === 0) return;

            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                setCurrentMonthIndex(prev => Math.max(0, prev - 1));
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                setCurrentMonthIndex(prev => Math.min(months.length - 1, prev + 1));
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [months]);

    const resetMatrix = () => {
        setMonths([]);
        setSubjects([]);
        setStudentsData([]);
        setGrandTotal(0);
        setVisibleCount(50);
        setSearchTerm('');
        setEnrollmentFilter('ALL');
        setCurrentMonthIndex(0);
    };

    const fetchBusinesses = async () => {
        try {
            const res = await axios.get('/admin/businesses');
            setBusinesses(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchBatches = async (bizId) => {
        try {
            const res = await axios.get(`/admin/batches/${bizId}`);
            setBatches(res.data.batches || res.data || []);
        } catch (err) { console.error(err); }
    };

    const fetchFinanceMatrixData = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get('/admin/data-export/finance-matrix', {
                params: { businessId: selectedBiz, batchId: selectedBatch }
            });
            setMonths(res.data.months || []);
            setSubjects(res.data.subjects || []);
            setStudentsData(res.data.students || []);
            setGrandTotal(res.data.grandTotal || 0);
            setCurrentMonthIndex(0);
        } catch (err) {
            setError("Failed to fetch matrix calculation nodes.");
        } finally {
            setLoading(false);
        }
    };

    const handleLoadMore = () => {
        setVisibleCount(prev => prev + 50);
    };

    // 🔥 Bulletproof formatCurrency fix 
    const formatCurrency = (val) => {
        const numericVal = Number(val);
        if (!numericVal || isNaN(numericVal) || numericVal === 0) {
            return <span className="text-gray-600 font-medium">-</span>;
        }
        return new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(numericVal);
    };

    const filteredData = studentsData.filter(stu => {
        const term = searchTerm.toLowerCase();
        const matchesSearch = !term ||
            stu.studentName?.toLowerCase().includes(term) ||
            stu.studentNo?.toLowerCase().includes(term) ||
            stu.phone?.includes(term) ||
            stu.whatsapp?.includes(term);

        const matchesType = enrollmentFilter === 'ALL' ||
            (stu.type && stu.type.toUpperCase() === enrollmentFilter);

        return matchesSearch && matchesType;
    });

    const processedData = [...filteredData].sort((a, b) => {
        const typeOrder = { 'Full': 1, 'Monthly': 2, 'Installment': 3, 'Upgrade': 4, 'Hybrid': 5 };
        const wA = typeOrder[a.type] || 99;
        const wB = typeOrder[b.type] || 99;
        if (wA !== wB) return wA - wB;
        // Secondary sort: numeric order of student number
        const numA = parseInt(a.studentNo?.replace(/\D/g, '')) || a.id || 0;
        const numB = parseInt(b.studentNo?.replace(/\D/g, '')) || b.id || 0;
        return numA - numB;
    });

    const activeMonth = months[currentMonthIndex];

    // 🔥 Fixed calculateColumnTotal logic 
    const calculateColumnTotal = (subjectName) => {
        if (!activeMonth) return 0;
        return processedData.reduce((acc, stu) => {
            const studentTotal = stu.matrixValues?.[activeMonth.id]?.[subjectName]?.total || 0;
            return acc + studentTotal;
        }, 0);
    };

    const getSubjectBreakdown = (subjectName) => {
        if (!activeMonth) {
            return {
                Full: { count: 0, amount: 0 },
                Monthly: { count: 0, amount: 0 },
                Installment: { count: 0, amount: 0 },
                Mix: { count: 0, amount: 0 }
            };
        }

        let fullCount = 0, fullAmt = 0;
        let monthlyCount = 0, monthlyAmt = 0;
        let installmentCount = 0, installmentAmt = 0;
        let mixCount = 0, mixAmt = 0;

        processedData.forEach(stu => {
            const val = stu.matrixValues?.[activeMonth.id]?.[subjectName];
            if (val && val.total > 0) {
                if (stu.type === 'Full') {
                    fullCount++;
                    fullAmt += val.total;
                } else if (stu.type === 'Monthly') {
                    monthlyCount++;
                    monthlyAmt += val.total;
                } else if (stu.type === 'Installment') {
                    installmentCount++;
                    installmentAmt += val.total;
                } else if (stu.type === 'Hybrid') {
                    mixCount++;
                    mixAmt += val.total;
                }
            }
        });

        return {
            Full: { count: fullCount, amount: fullAmt },
            Monthly: { count: monthlyCount, amount: monthlyAmt },
            Installment: { count: installmentCount, amount: installmentAmt },
            Mix: { count: mixCount, amount: mixAmt }
        };
    };

    const getOverallActiveMonthBreakdown = () => {
        if (!activeMonth) {
            return {
                Full: { count: 0, amount: 0 },
                Monthly: { count: 0, amount: 0 },
                Installment: { count: 0, amount: 0 },
                Mix: { count: 0, amount: 0 }
            };
        }

        let fullCount = 0, fullAmt = 0;
        let monthlyCount = 0, monthlyAmt = 0;
        let installmentCount = 0, installmentAmt = 0;
        let mixCount = 0, mixAmt = 0;

        processedData.forEach(stu => {
            let stuMonthTotal = 0;
            if (stu.matrixValues?.[activeMonth.id]) {
                subjects.forEach(sub => {
                    stuMonthTotal += (stu.matrixValues[activeMonth.id][sub]?.total || 0);
                });
            }
            if (stuMonthTotal > 0) {
                if (stu.type === 'Full') {
                    fullCount++;
                    fullAmt += stuMonthTotal;
                } else if (stu.type === 'Monthly') {
                    monthlyCount++;
                    monthlyAmt += stuMonthTotal;
                } else if (stu.type === 'Installment') {
                    installmentCount++;
                    installmentAmt += stuMonthTotal;
                } else if (stu.type === 'Hybrid') {
                    mixCount++;
                    mixAmt += stuMonthTotal;
                }
            }
        });

        return {
            Full: { count: fullCount, amount: fullAmt },
            Monthly: { count: monthlyCount, amount: monthlyAmt },
            Installment: { count: installmentCount, amount: installmentAmt },
            Mix: { count: mixCount, amount: mixAmt }
        };
    };

    const exportToExcel = () => {
        if (processedData.length === 0) return;

        // Calculate bottom aggregates for ALL columns
        const colTotals = {}; // key: "mId_sub" -> { total, full, monthly, installment, hybrid }
        let overallGrandTotal = 0;
        let overallFullGrand = 0;
        let overallMonthlyGrand = 0;
        let overallInstallmentGrand = 0;
        let overallHybridGrand = 0;

        months.forEach(m => {
            subjects.forEach(sub => {
                const key = `${m.id}_${sub}`;
                colTotals[key] = { total: 0, full: 0, monthly: 0, installment: 0, hybrid: 0 };
            });
        });

        processedData.forEach(stu => {
            const isHybrid = stu.type === 'Hybrid';
            const isFull = stu.type === 'Full';
            const isMonthly = stu.type === 'Monthly';
            const isInstallment = stu.type === 'Installment';

            overallGrandTotal += Number(stu.totalPaid || 0);
            if (isFull) overallFullGrand += Number(stu.totalPaid || 0);
            if (isMonthly) overallMonthlyGrand += Number(stu.totalPaid || 0);
            if (isInstallment) overallInstallmentGrand += Number(stu.totalPaid || 0);
            if (isHybrid) overallHybridGrand += Number(stu.totalPaid || 0);

            months.forEach(m => {
                subjects.forEach(sub => {
                    const key = `${m.id}_${sub}`;
                    const cellData = stu.matrixValues?.[m.id]?.[sub];
                    if (cellData && cellData.total > 0) {
                        colTotals[key].total += cellData.total;
                        
                        if (isFull) colTotals[key].full += cellData.total;
                        else if (isMonthly) colTotals[key].monthly += cellData.total;
                        else if (isInstallment) colTotals[key].installment += cellData.total;
                        else if (isHybrid) colTotals[key].hybrid += cellData.total;
                    }
                });
            });
        });

        let html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<!--[if gte mso 9]>
<xml>
 <x:ExcelWorkbook>
  <x:ExcelWorksheets>
   <x:ExcelWorksheet>
    <x:Name>Finance Matrix</x:Name>
    <x:WorksheetOptions>
     <x:DisplayGridlines/>
    </x:WorksheetOptions>
   </x:ExcelWorksheet>
  </x:ExcelWorksheets>
 </x:ExcelWorkbook>
</xml>
<![endif]-->
<style>
  table { border-collapse: collapse; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
  th { background-color: #0F172A; color: #FFFFFF; font-weight: bold; border: 1px solid #334155; text-align: center; padding: 8px; }
  td { border: 1px solid #CBD5E1; text-align: center; padding: 6px; font-size: 13px; color: #334155; }
  .month-header { background-color: #1E293B; color: #F8FAFC; font-size: 14px; font-weight: 800; border: 1px solid #475569; }
  .subject-header { background-color: #334155; color: #F1F5F9; font-size: 12px; font-weight: 700; border: 1px solid #475569; }
  .meta-header { background-color: #0F172A; color: #FFFFFF; font-size: 13px; font-weight: 800; border: 1px solid #334155; }
  .student-no { font-weight: bold; color: #0F172A; background-color: #F8FAFC; }
  .student-name { text-align: left; font-weight: 600; }
  .total-cell { background-color: #ECFDF5; color: #047857; font-weight: bold; }
  .hybrid-cell { font-size: 11px; background-color: #FDF4FF; color: #701A75; }
</style>
</head>
<body>
<table>
  <thead>
    <!-- Row 1: Main Header (Nested Categories) -->
    <tr>
      <th rowspan="2" class="meta-header">Student ID</th>
      <th rowspan="2" class="meta-header">Name</th>
      <th rowspan="2" class="meta-header">Birth Year</th>
      <th rowspan="2" class="meta-header">Phone</th>
      <th rowspan="2" class="meta-header">WhatsApp</th>
      <th rowspan="2" class="meta-header">Enrollment Type</th>
`;

        months.forEach(m => {
            html += `      <th colspan="${subjects.length}" class="month-header">${m.name}</th>\n`;
        });

        html += `      <th rowspan="2" class="meta-header" style="background-color: #064E3B; color: #FFFFFF;">Net Total Paid</th>
    </tr>
    <!-- Row 2: Sub-categories (Subjects) -->
    <tr>
`;

        months.forEach(m => {
            subjects.forEach(sub => {
                html += `      <th class="subject-header">${sub}</th>\n`;
            });
        });

        html += `    </tr>
  </thead>
  <tbody>
`;

        // Add Student Rows
        studentsData.forEach(stu => {
            const isHybrid = stu.type === 'Hybrid';
            html += `    <tr>
      <td class="student-no">${stu.studentNo || '-'}</td>
      <td class="student-name">${stu.studentName || '-'}</td>
      <td>${stu.birthYear || '-'}</td>
      <td style="mso-number-format:'\\@';">${stu.phone || '-'}</td>
      <td style="mso-number-format:'\\@';">${stu.whatsapp || '-'}</td>
      <td>${isHybrid ? 'Hybrid (Mixed)' : (stu.type || '-')}</td>
`;

            months.forEach(m => {
                subjects.forEach(sub => {
                    const cellData = stu.matrixValues?.[m.id]?.[sub];
                    if (!cellData || cellData.total === 0) {
                        html += `      <td style="mso-number-format:'\\#\\,\\#\\#0\\.00';">0</td>\n`;
                    } else if (isHybrid) {
                        let parts = [];
                        if (cellData.Full > 0) parts.push(`Full: ${cellData.Full.toFixed(2)}`);
                        if (cellData.Monthly > 0) parts.push(`Mon: ${cellData.Monthly.toFixed(2)}`);
                        if (cellData.Installment > 0) parts.push(`Inst: ${cellData.Installment.toFixed(2)}`);
                        html += `      <td class="hybrid-cell">${parts.join(' | ')}</td>\n`;
                    } else {
                        html += `      <td style="mso-number-format:'\\#\\,\\#\\#0\\.00';">${cellData.total}</td>\n`;
                    }
                });
            });

            html += `      <td class="total-cell" style="mso-number-format:'\\#\\,\\#\\#0\\.00';">${stu.totalPaid || 0}</td>
    </tr>\n`;
        });

        // 🟢 Add Total Revenue Row at the very bottom
        html += `    <tr style="background-color: #ECFDF5; font-weight: bold;">
      <td colspan="6" style="font-weight: bold; background-color: #D1FAE5; text-align: right; border: 1px solid #34D399;">Total Revenue</td>
`;
        months.forEach(m => {
            subjects.forEach(sub => {
                const key = `${m.id}_${sub}`;
                html += `      <td style="mso-number-format:'\\#\\,\\#\\#0\\.00'; font-weight: bold; background-color: #D1FAE5; border: 1px solid #34D399;">${colTotals[key].total}</td>\n`;
            });
        });
        html += `      <td style="mso-number-format:'\\#\\,\\#\\#0\\.00'; font-weight: bold; background-color: #059669; color: #FFFFFF; border: 1px solid #059669;">${overallGrandTotal}</td>
    </tr>\n`;

        // 🟢 Add Full Card Total Row
        html += `    <tr style="background-color: #FAF5FF;">
      <td colspan="6" style="font-weight: bold; text-align: right; color: #7E22CE; border: 1px solid #C084FC;">Full Card Total</td>
`;
        months.forEach(m => {
            subjects.forEach(sub => {
                const key = `${m.id}_${sub}`;
                html += `      <td style="mso-number-format:'\\#\\,\\#\\#0\\.00'; font-weight: bold; color: #7E22CE; border: 1px solid #C084FC;">${colTotals[key].full}</td>\n`;
            });
        });
        html += `      <td style="mso-number-format:'\\#\\,\\#\\#0\\.00'; font-weight: bold; color: #7E22CE; border: 1px solid #C084FC;">${overallFullGrand}</td>
    </tr>\n`;

        // 🟢 Add Monthly Card Total Row
        html += `    <tr style="background-color: #F0F9FF;">
      <td colspan="6" style="font-weight: bold; text-align: right; color: #0369A1; border: 1px solid #38BDF8;">Monthly Card Total</td>
`;
        months.forEach(m => {
            subjects.forEach(sub => {
                const key = `${m.id}_${sub}`;
                html += `      <td style="mso-number-format:'\\#\\,\\#\\#0\\.00'; font-weight: bold; color: #0369A1; border: 1px solid #38BDF8;">${colTotals[key].monthly}</td>\n`;
            });
        });
        html += `      <td style="mso-number-format:'\\#\\,\\#\\#0\\.00'; font-weight: bold; color: #0369A1; border: 1px solid #38BDF8;">${overallMonthlyGrand}</td>
    </tr>\n`;

        // 🟢 Add Installment Card Total Row
        html += `    <tr style="background-color: #FFFBEB;">
      <td colspan="6" style="font-weight: bold; text-align: right; color: #B45309; border: 1px solid #FBBF24;">Installment Card Total</td>
`;
        months.forEach(m => {
            subjects.forEach(sub => {
                const key = `${m.id}_${sub}`;
                html += `      <td style="mso-number-format:'\\#\\,\\#\\#0\\.00'; font-weight: bold; color: #B45309; border: 1px solid #FBBF24;">${colTotals[key].installment}</td>\n`;
            });
        });
        html += `      <td style="mso-number-format:'\\#\\,\\#\\#0\\.00'; font-weight: bold; color: #B45309; border: 1px solid #FBBF24;">${overallInstallmentGrand}</td>
    </tr>\n`;

        // 🟢 Add Hybrid (Mixed) Card Total Row
        html += `    <tr style="background-color: #FDF4FF;">
      <td colspan="6" style="font-weight: bold; text-align: right; color: #A21CAF; border: 1px solid #F472B6;">Hybrid (Mixed) Card Total</td>
`;
        months.forEach(m => {
            subjects.forEach(sub => {
                const key = `${m.id}_${sub}`;
                html += `      <td style="mso-number-format:'\\#\\,\\#\\#0\\.00'; font-weight: bold; color: #A21CAF; border: 1px solid #F472B6;">${colTotals[key].hybrid}</td>\n`;
            });
        });
        html += `      <td style="mso-number-format:'\\#\\,\\#\\#0\\.00'; font-weight: bold; color: #A21CAF; border: 1px solid #F472B6;">${overallHybridGrand}</td>
    </tr>\n`;

        html += `  </tbody>
</table>
</body>
</html>
`;

        const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Weighted_Finance_Matrix_Batch_${selectedBatch}.xls`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="w-full mt-6 bg-slate-900 border border-slate-700/50 rounded-2xl shadow-xl overflow-hidden font-sans text-gray-200 flex flex-col">

            <div className="p-5 bg-slate-800/50 border-b border-slate-700/50 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h2 className="text-xl font-semibold tracking-tight text-white flex items-center gap-2">
                        <TrendingUp className="text-emerald-400" size={24} />
                        Weighted Student Revenue Matrix Center
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">Content Hub configuration matrix engine reflecting unique price weight parameters.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    {canSeeAllBusinesses && (
                        <select
                            className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white outline-none cursor-pointer"
                            value={selectedBiz}
                            onChange={(e) => setSelectedBiz(e.target.value)}
                        >
                            <option value="">Select Corporate Business</option>
                            {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    )}

                    {selectedBiz && (
                        <select
                            className="bg-slate-950 border border-emerald-500/50 rounded-lg px-4 py-2.5 text-sm text-emerald-400 outline-none cursor-pointer"
                            value={selectedBatch}
                            onChange={(e) => setSelectedBatch(e.target.value)}
                        >
                            <option value="">Select Academic Batch</option>
                            {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    )}

                    {studentsData.length > 0 && (
                        <button
                            onClick={exportToExcel}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors shadow-md"
                        >
                            <Download size={16} />
                            Export Excel Node
                        </button>
                    )}
                </div>
            </div>

            {studentsData.length > 0 && !loading && (
                <div className="p-4 bg-slate-800/30 border-b border-slate-700/50 flex flex-col md:flex-row gap-4 items-center justify-between z-10 relative">
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        <div className="relative w-full sm:w-[260px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                            <input
                                type="text"
                                placeholder="ID, Name, Contact lookup..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white outline-none"
                            />
                        </div>

                        <select
                            value={enrollmentFilter}
                            onChange={(e) => setEnrollmentFilter(e.target.value)}
                            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none cursor-pointer"
                        >
                            <option value="ALL">All Payments</option>
                            <option value="FULL">Full Cards</option>
                            <option value="INSTALLMENT">Installments</option>
                            <option value="MONTHLY">Monthly Rows</option>
                            <option value="UPGRADE">Upgraded Payments</option>
                            <option value="HYBRID">Hybrid (Mixed) Payments</option>
                        </select>
                    </div>

                    {months.length > 0 && (
                        <div className="flex items-center gap-4 bg-slate-950 px-4 py-1.5 rounded-xl border border-slate-700/60 shadow-inner">
                            <button
                                disabled={currentMonthIndex === 0}
                                onClick={() => setCurrentMonthIndex(prev => prev - 1)}
                                className="p-1.5 text-emerald-400 hover:text-emerald-300 disabled:text-gray-700 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <div className="text-center min-w-[150px]">
                                <span className="text-xs uppercase font-semibold text-gray-500 tracking-wider block">Target Period</span>
                                <span className="text-sm font-bold text-white">{activeMonth?.name}</span>
                            </div>
                            <button
                                disabled={currentMonthIndex === months.length - 1}
                                onClick={() => setCurrentMonthIndex(prev => prev + 1)}
                                className="p-1.5 text-emerald-400 hover:text-emerald-300 disabled:text-gray-700 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    )}
                </div>
            )}

            <div className="w-full relative flex-1 bg-slate-900 flex flex-col">
                <div className="overflow-auto custom-scrollbar relative max-h-[65vh] w-full">

                    {loading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm z-50">
                            <Loader2 className="w-10 h-10 animate-spin text-emerald-400 mb-3" />
                            <p className="text-sm text-gray-400">Compiling multi-layered weighted metrics rows...</p>
                        </div>
                    ) : error ? (
                        <div className="p-12 text-center text-red-400 flex flex-col items-center justify-center gap-2">
                            <AlertCircle size={40} className="text-red-500" />
                            <p className="text-base font-medium">{error}</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse min-w-max">
                            <thead>
                                <tr className="bg-slate-950 text-sm font-semibold text-gray-300 uppercase tracking-wide h-[50px]">
                                    <th className="min-w-[80px] max-w-[80px] p-3 sticky left-0 top-0 bg-slate-950 z-[60] border-r border-b border-slate-700/50 text-center shadow-md">ID</th>
                                    <th className="min-w-[200px] max-w-[200px] p-3 sticky left-[80px] top-0 bg-slate-950 z-[60] border-r border-b border-slate-700/50 shadow-md">Student Info</th>
                                    <th className="min-w-[120px] max-w-[120px] p-3 sticky left-[280px] top-0 bg-slate-950 z-[60] border-r border-b border-slate-700/50 text-center shadow-md">Type</th>

                                    {subjects.map((sub, sIdx) => (
                                        <th
                                            key={sIdx}
                                            className={`min-w-[140px] max-w-[140px] whitespace-normal text-[13px] p-3 text-center border-b border-r border-slate-700/50 sticky top-0 font-bold text-white z-40 ${sIdx % 2 === 0 ? 'bg-slate-950' : 'bg-slate-900'}`}
                                        >
                                            {sub}
                                        </th>
                                    ))}
                                    <th className="min-w-[140px] max-w-[140px] p-3 text-right bg-emerald-950 text-emerald-400 font-bold border-b border-slate-700/50 sticky top-0 right-0 z-50 backdrop-blur-md">Monthly Total</th>
                                </tr>
                            </thead>

                            <tbody className="text-sm divide-y divide-slate-800/40 whitespace-nowrap">
                                {processedData.slice(0, visibleCount).map((stu) => {

                                    const isHybrid = stu.type === 'Hybrid';
                                    const rowClasses = isHybrid
                                        ? "bg-fuchsia-950/20 border-y border-fuchsia-500/40 hover:bg-fuchsia-900/30 transition-colors group relative"
                                        : "hover:bg-slate-800/20 transition-colors group";

                                    // 🔥 ROW TOTAL FIX: Masekata adalawa peliye ekathukireema
                                    let activeMonthRowTotal = 0;
                                    if (activeMonth && stu.matrixValues?.[activeMonth.id]) {
                                        subjects.forEach(sub => {
                                            activeMonthRowTotal += (stu.matrixValues[activeMonth.id][sub]?.total || 0);
                                        });
                                    }

                                    return (
                                        <tr key={stu.id} className={rowClasses}>
                                            <td className={`p-3 font-semibold text-center sticky left-0 z-20 border-r border-slate-700/50 transition-colors ${isHybrid ? 'text-fuchsia-400 bg-fuchsia-950/90 group-hover:bg-fuchsia-900' : 'text-emerald-500 bg-slate-900 group-hover:bg-slate-800'}`}>
                                                {stu.studentNo}
                                            </td>
                                            <td className={`p-3 font-medium text-gray-200 sticky left-[80px] z-20 border-r border-slate-700/50 transition-colors ${isHybrid ? 'bg-fuchsia-950/90 group-hover:bg-fuchsia-900' : 'bg-slate-900 group-hover:bg-slate-800'}`}>
                                                <div className="flex flex-col gap-1 whitespace-normal">
                                                    <span className="font-semibold text-white text-[15px] line-clamp-1">{stu.studentName}</span>
                                                    <span className="text-[12px] text-gray-400">Birth Year: {stu.birthYear}</span>
                                                    <span className={`text-[12px] flex flex-col font-medium ${isHybrid ? 'text-fuchsia-400/80' : 'text-emerald-500/80'}`}>
                                                        {stu.phone && <span>P: {stu.phone}</span>}
                                                        {stu.whatsapp && stu.whatsapp !== stu.phone && <span>W: {stu.whatsapp}</span>}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className={`p-3 border-r border-slate-700/50 text-center sticky left-[280px] z-20 shadow-[4px_0_10px_-3px_rgba(0,0,0,0.3)] transition-colors ${isHybrid ? 'bg-fuchsia-950/90 group-hover:bg-fuchsia-900' : 'bg-slate-900 group-hover:bg-slate-800'}`}>
                                                <span className={`px-2.5 py-1.5 rounded text-[13px] font-bold border shadow-sm inline-block ${stu.type === 'Hybrid' ? 'bg-fuchsia-500/20 border-fuchsia-500/50 text-fuchsia-300' :
                                                    stu.type === 'Full' ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' :
                                                        stu.type === 'Monthly' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                                                            stu.type === 'Upgrade' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' :
                                                                'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                                    }`}>
                                                    {stu.type === 'Hybrid' ? 'MIXED PAY' : stu.type?.toUpperCase()}
                                                </span>
                                            </td>

                                            {subjects.map((sub, sIdx) => {
                                                const cellData = activeMonth ? stu.matrixValues?.[activeMonth.id]?.[sub] : null;
                                                return (
                                                    <td key={sIdx} className={`p-2 align-middle text-center border-r border-slate-700/40 transition-colors ${sIdx % 2 === 0 ? 'bg-slate-950/25' : 'bg-slate-800/15'}`}>
                                                        {cellData && (cellData.Full > 0 || cellData.Monthly > 0 || cellData.Installment > 0) ? (
                                                            <div className="flex flex-col items-center gap-1 font-medium">
                                                                {cellData.Full > 0 && <span className="text-[12px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">F: {formatCurrency(cellData.Full)}</span>}
                                                                {cellData.Monthly > 0 && <span className="text-[12px] text-blue-400">M: {formatCurrency(cellData.Monthly)}</span>}
                                                                {cellData.Installment > 0 && <span className="text-[12px] text-amber-400">I: {formatCurrency(cellData.Installment)}</span>}
                                                            </div>
                                                        ) : <span className="text-gray-600">-</span>}
                                                    </td>
                                                );
                                            })}

                                            <td className={`p-4 text-right border-l border-emerald-500/20 sticky right-0 z-20 shadow-[-4px_0_10px_-3px_rgba(0,0,0,0.3)] ${isHybrid ? 'bg-fuchsia-950/80' : 'bg-emerald-950/50'}`}>
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className={`text-[11px] font-medium tracking-wide uppercase ${isHybrid ? 'text-fuchsia-400/70' : 'text-emerald-500/70'}`}>This Month</span>
                                                    <span className={`font-bold ${isHybrid ? 'text-fuchsia-300' : 'text-emerald-400'}`}>{formatCurrency(activeMonthRowTotal)}</span>
                                                    <div className="w-full h-px bg-slate-700/50 my-0.5"></div>
                                                    <span className={`text-[11px] font-medium tracking-wide uppercase ${isHybrid ? 'text-fuchsia-400/70' : 'text-emerald-500/70'}`}>Total Paid</span>
                                                    <span className={`font-extrabold ${isHybrid ? 'text-fuchsia-100' : 'text-emerald-100'}`}>{formatCurrency(stu.totalPaid)}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}

                                <tr className="bg-slate-950/95 font-bold border-t-2 border-slate-700 text-white sticky bottom-0 z-30 align-top">
                                    <td className="p-4 text-left uppercase text-xs tracking-wider text-gray-400 bg-slate-950 sticky left-0 z-40 border-r border-slate-700/50 shadow-[4px_0_10px_-3px_rgba(0,0,0,0.3)]" colSpan={3}>
                                        <div className="flex flex-col gap-2">
                                            <span>Monthly Subject Revenue</span>
                                            {(() => {
                                                const overall = getOverallActiveMonthBreakdown();
                                                return (
                                                    <div className="mt-3 pt-3 border-t border-slate-800 flex flex-col gap-1.5 text-[11px] font-normal text-left text-slate-400 tracking-normal normal-case">
                                                        {overall.Full.amount > 0 && (
                                                            <div className="flex justify-between gap-4">
                                                                <span className="text-purple-400 font-semibold">Full ({overall.Full.count}):</span>
                                                                <span className="font-bold text-slate-300">{formatCurrency(overall.Full.amount)}</span>
                                                            </div>
                                                        )}
                                                        {overall.Monthly.amount > 0 && (
                                                            <div className="flex justify-between gap-4">
                                                                <span className="text-blue-400 font-semibold">Monthly ({overall.Monthly.count}):</span>
                                                                <span className="font-bold text-slate-300">{formatCurrency(overall.Monthly.amount)}</span>
                                                            </div>
                                                        )}
                                                        {overall.Installment.amount > 0 && (
                                                            <div className="flex justify-between gap-4">
                                                                <span className="text-amber-400 font-semibold">Installment ({overall.Installment.count}):</span>
                                                                <span className="font-bold text-slate-300">{formatCurrency(overall.Installment.amount)}</span>
                                                            </div>
                                                        )}
                                                        {overall.Mix.amount > 0 && (
                                                            <div className="flex justify-between gap-4">
                                                                <span className="text-fuchsia-400 font-semibold">Mix ({overall.Mix.count}):</span>
                                                                <span className="font-bold text-slate-300">{formatCurrency(overall.Mix.amount)}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </td>
                                    {subjects.map((sub, sIdx) => {
                                        const totalColVal = calculateColumnTotal(sub);
                                        const breakdown = getSubjectBreakdown(sub);
                                        return (
                                            <td
                                                key={sIdx}
                                                className={`p-3 text-center border-r border-slate-700/50 text-emerald-400 z-30 ${sIdx % 2 === 0 ? 'bg-slate-900/90' : 'bg-slate-800/90'}`}
                                            >
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-extrabold">{formatCurrency(totalColVal)}</span>
                                                    
                                                    <div className="mt-3 pt-3 border-t border-slate-700/50 flex flex-col gap-1 text-[11px] font-normal text-left text-slate-300">
                                                        {breakdown.Full.amount > 0 && (
                                                            <div className="flex justify-between gap-2">
                                                                <span className="text-purple-400">Full ({breakdown.Full.count}):</span>
                                                                <span className="font-medium">{formatCurrency(breakdown.Full.amount)}</span>
                                                            </div>
                                                        )}
                                                        {breakdown.Monthly.amount > 0 && (
                                                            <div className="flex justify-between gap-2">
                                                                <span className="text-blue-400">Monthly ({breakdown.Monthly.count}):</span>
                                                                <span className="font-medium">{formatCurrency(breakdown.Monthly.amount)}</span>
                                                            </div>
                                                        )}
                                                        {breakdown.Installment.amount > 0 && (
                                                            <div className="flex justify-between gap-2">
                                                                <span className="text-amber-400">Instal ({breakdown.Installment.count}):</span>
                                                                <span className="font-medium">{formatCurrency(breakdown.Installment.amount)}</span>
                                                            </div>
                                                        )}
                                                        {breakdown.Mix.amount > 0 && (
                                                            <div className="flex justify-between gap-2">
                                                                <span className="text-fuchsia-400">Mix ({breakdown.Mix.count}):</span>
                                                                <span className="font-medium">{formatCurrency(breakdown.Mix.amount)}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        );
                                    })}
                                    <td className="p-4 text-right text-emerald-400 bg-emerald-900/90 font-extrabold sticky right-0 z-40 shadow-[-4px_0_10px_-3px_rgba(0,0,0,0.3)] border-l border-slate-700/50">
                                        {formatCurrency(grandTotal)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    )}
                </div>

                {processedData.length > visibleCount && !loading && (
                    <div className="p-4 bg-slate-950/50 border-t border-slate-700/50 flex justify-center">
                        <button
                            onClick={handleLoadMore}
                            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-gray-200 text-xs font-medium px-4 py-2 rounded-lg transition-all"
                        >
                            <ChevronDown size={14} className="animate-bounce text-emerald-400" />
                            Load More Rows ({visibleCount} of {processedData.length})
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}