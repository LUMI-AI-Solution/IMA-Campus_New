import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { 
  Loader2, AlertCircle, ChevronDown, TrendingUp, ChevronLeft, ChevronRight, 
  Search, Download, Building2, GraduationCap, Users, DollarSign, Sparkles, Layers, RefreshCw
} from 'lucide-react';

export default function FinanceMatrix({ loggedInUser }) {
    const roleUpper = loggedInUser?.role ? String(loggedInUser.role).toUpperCase().replace(/[\s_-]+/g, '_') : '';
    const deptUpper = loggedInUser?.department ? String(loggedInUser.department).toUpperCase().replace(/[\s_-]+/g, '_') : '';
    const isSystemAdmin = ['SYSTEM_ADMIN', 'DIRECTOR', 'SUPER_ADMIN', 'ADMIN'].includes(roleUpper);
    const isFinanceDept = deptUpper === 'FINANCE' || roleUpper === 'FINANCE';

    const [businesses, setBusinesses] = useState([]);
    const [batches, setBatches] = useState([]);
    const [selectedBiz, setSelectedBiz] = useState(loggedInUser?.businessId ? String(loggedInUser.businessId) : '');
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
                } else if (fetchedBiz.length > 0) {
                    setSelectedBiz(fetchedBiz[0].id.toString());
                    fetchBatches(fetchedBiz[0].id.toString());
                }
            } catch (e) { console.error(e); }
        };
        fetchInitialBiz();
    }, []);

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

    const formatCurrency = (val) => {
        const numericVal = Number(val);
        if (!numericVal || isNaN(numericVal) || numericVal === 0) {
            return <span className="text-slate-600 font-medium">-</span>;
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
        const numA = parseInt(a.studentNo?.replace(/\D/g, '')) || a.id || 0;
        const numB = parseInt(b.studentNo?.replace(/\D/g, '')) || b.id || 0;
        return numA - numB;
    });

    const activeMonth = months[currentMonthIndex];

    const calculateColumnTotal = (subjectName) => {
        if (!activeMonth) return 0;
        return processedData.reduce((acc, stu) => {
            const studentTotal = stu.matrixValues?.[activeMonth.id]?.[subjectName]?.total || 0;
            return acc + studentTotal;
        }, 0);
    };

    const getSubjectBreakdown = (subjectName) => {
        const breakdown = {};
        if (!activeMonth) return breakdown;
        processedData.forEach(stu => {
            const val = stu.matrixValues?.[activeMonth.id]?.[subjectName];
            if (val && val.total > 0) {
                const type = stu.type || 'Other';
                if (!breakdown[type]) breakdown[type] = { count: 0, amount: 0 };
                breakdown[type].count++;
                breakdown[type].amount += val.total;
            }
        });
        return breakdown;
    };

    const getOverallActiveMonthBreakdown = () => {
        const breakdown = {};
        if (!activeMonth) return breakdown;
        processedData.forEach(stu => {
            let stuMonthTotal = 0;
            if (stu.matrixValues?.[activeMonth.id]) {
                subjects.forEach(sub => {
                    stuMonthTotal += (stu.matrixValues[activeMonth.id][sub]?.total || 0);
                });
            }
            if (stuMonthTotal > 0) {
                const type = stu.type || 'Other';
                if (!breakdown[type]) breakdown[type] = { count: 0, amount: 0 };
                breakdown[type].count++;
                breakdown[type].amount += stuMonthTotal;
            }
        });
        return breakdown;
    };

    const activeMonthGrandTotal = (() => {
        const breakdown = getOverallActiveMonthBreakdown();
        return Object.values(breakdown).reduce((sum, item) => sum + item.amount, 0);
    })();

    const exportToExcel = () => {
        if (processedData.length === 0) return;

        const typeTotals = {};
        const colTypeTotals = {};
        let overallGrandTotal = 0;

        months.forEach(m => {
            subjects.forEach(sub => {
                const key = `${m.id}_${sub}`;
                colTypeTotals[key] = { total: 0 };
            });
        });

        processedData.forEach(stu => {
            const type = stu.type || 'Other';
            if (!typeTotals[type]) typeTotals[type] = 0;
            
            const totalPaid = Number(stu.totalPaid || 0);
            overallGrandTotal += totalPaid;
            typeTotals[type] += totalPaid;

            months.forEach(m => {
                subjects.forEach(sub => {
                    const key = `${m.id}_${sub}`;
                    const cellData = stu.matrixValues?.[m.id]?.[sub];
                    if (cellData && cellData.total > 0) {
                        colTypeTotals[key].total += cellData.total;
                        if (!colTypeTotals[key][type]) colTypeTotals[key][type] = 0;
                        colTypeTotals[key][type] += cellData.total;
                    }
                });
            });
        });

        const escapeCSV = (str) => `"${String(str).replace(/"/g, '""')}"`;
        let csvContent = "";

        const headers = ['Student ID', 'Name', 'Birth Year', 'Phone', 'WhatsApp', 'Enrollment Type'];
        months.forEach(m => {
            subjects.forEach(sub => {
                headers.push(`${m.name} - ${sub}`);
            });
        });
        headers.push('Net Total Paid');
        csvContent += headers.map(escapeCSV).join(',') + '\n';

        processedData.forEach(stu => {
            const isHybrid = stu.type === 'Hybrid';
            const row = [
                stu.studentNo || '-',
                stu.studentName || '-',
                stu.birthYear || '-',
                stu.phone ? `'${stu.phone}` : '-',
                stu.whatsapp ? `'${stu.whatsapp}` : '-',
                isHybrid ? 'Hybrid (Mixed)' : (stu.type || '-')
            ];

            months.forEach(m => {
                subjects.forEach(sub => {
                    const cellData = stu.matrixValues?.[m.id]?.[sub];
                    if (!cellData || cellData.total === 0) {
                        row.push('0.00');
                    } else if (isHybrid) {
                        let parts = [];
                        if (cellData.Full > 0) parts.push(`Full: ${cellData.Full.toFixed(2)}`);
                        if (cellData.Monthly > 0) parts.push(`Mon: ${cellData.Monthly.toFixed(2)}`);
                        if (cellData.Installment > 0) parts.push(`Inst: ${cellData.Installment.toFixed(2)}`);
                        row.push(parts.join(' | '));
                    } else {
                        row.push(cellData.total.toFixed(2));
                    }
                });
            });
            row.push(Number(stu.totalPaid || 0).toFixed(2));
            csvContent += row.map(escapeCSV).join(',') + '\n';
        });

        const totalRow = ['', '', '', '', '', 'Total Revenue'];
        months.forEach(m => {
            subjects.forEach(sub => {
                totalRow.push(colTypeTotals[`${m.id}_${sub}`].total.toFixed(2));
            });
        });
        totalRow.push(overallGrandTotal.toFixed(2));
        csvContent += totalRow.map(escapeCSV).join(',') + '\n';

        Object.keys(typeTotals).sort().forEach(type => {
            const tRow = ['', '', '', '', '', `${type === 'Hybrid' ? 'Hybrid (Mixed)' : type} Total`];
            months.forEach(m => {
                subjects.forEach(sub => {
                    tRow.push((colTypeTotals[`${m.id}_${sub}`][type] || 0).toFixed(2));
                });
            });
            tRow.push(typeTotals[type].toFixed(2));
            csvContent += tRow.map(escapeCSV).join(',') + '\n';
        });

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Weighted_Finance_Matrix_Batch_${selectedBatch}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const selectedBizName = businesses.find(b => String(b.id) === String(selectedBiz))?.name || 'Selected Business';
    const selectedBatchName = batches.find(b => String(b.id) === String(selectedBatch))?.name || 'Selected Batch';

    return (
        <div className="w-full mt-4 bg-slate-950/90 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden font-sans text-slate-200 flex flex-col backdrop-blur-xl">

            {/* Header Toolbar */}
            <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border-b border-slate-800/80 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 shadow-md">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 rounded-2xl shadow-lg shadow-emerald-500/10 text-emerald-400">
                        <TrendingUp size={28} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                            Weighted Student Revenue Matrix Center
                        </h2>
                        <p className="text-xs text-slate-400 mt-1 font-medium">
                            Real-time content hub pricing parameters & weighted subject revenue matrix engine.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                    {/* Business Selector */}
                    <div className="relative flex-1 sm:flex-initial min-w-[200px]">
                        <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        <select
                            className="w-full bg-slate-900/90 border border-slate-700/80 hover:border-slate-600 rounded-2xl pl-10 pr-8 py-2.5 text-xs font-bold text-white outline-none cursor-pointer focus:border-emerald-500 transition-all appearance-none shadow-sm"
                            value={selectedBiz}
                            onChange={(e) => setSelectedBiz(e.target.value)}
                        >
                            <option value="">Choose Business...</option>
                            {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
                    </div>

                    {/* Batch Selector */}
                    <div className="relative flex-1 sm:flex-initial min-w-[220px]">
                        <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none" size={16} />
                        <select
                            className="w-full bg-slate-900/90 border border-emerald-500/40 hover:border-emerald-500 rounded-2xl pl-10 pr-8 py-2.5 text-xs font-bold text-emerald-300 outline-none cursor-pointer focus:border-emerald-400 disabled:opacity-40 transition-all appearance-none shadow-sm shadow-emerald-500/5"
                            value={selectedBatch}
                            onChange={(e) => setSelectedBatch(e.target.value)}
                            disabled={!selectedBiz}
                        >
                            <option value="">Choose Academic Batch...</option>
                            {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none" size={16} />
                    </div>

                    {/* Export Excel Button */}
                    {studentsData.length > 0 && (
                        <button
                            onClick={exportToExcel}
                            className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold px-5 py-2.5 rounded-2xl transition-all shadow-lg shadow-emerald-600/20 active:scale-95 cursor-pointer whitespace-nowrap"
                        >
                            <Download size={16} />
                            Export Excel Node
                        </button>
                    )}
                </div>
            </div>

            {/* Quick Stats Summary Grid (Only shown when matrix data exists) */}
            {studentsData.length > 0 && !loading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6 bg-slate-900/40 border-b border-slate-800/80">
                    <div className="bg-slate-900/80 border border-emerald-500/20 p-4 rounded-2xl flex items-center gap-4 shadow-lg shadow-emerald-500/5">
                        <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                            <DollarSign size={22} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-widest">Total Batch Revenue</p>
                            <h3 className="text-xl font-black text-emerald-300">{formatCurrency(grandTotal)}</h3>
                        </div>
                    </div>

                    <div className="bg-slate-900/80 border border-cyan-500/20 p-4 rounded-2xl flex items-center gap-4 shadow-lg shadow-cyan-500/5">
                        <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
                            <TrendingUp size={22} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-cyan-400/80 uppercase tracking-widest">Active Month Revenue</p>
                            <h3 className="text-xl font-black text-cyan-300">{formatCurrency(activeMonthGrandTotal)}</h3>
                        </div>
                    </div>

                    <div className="bg-slate-900/80 border border-purple-500/20 p-4 rounded-2xl flex items-center gap-4 shadow-lg shadow-purple-500/5">
                        <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
                            <Users size={22} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-purple-400/80 uppercase tracking-widest">Enrolled Students</p>
                            <h3 className="text-xl font-black text-purple-300">{processedData.length} Students</h3>
                        </div>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-700/60 p-4 rounded-2xl flex items-center gap-4 shadow-lg">
                        <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                            <Layers size={22} />
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{selectedBizName}</p>
                            <h3 className="text-xs font-black text-white truncate">{selectedBatchName}</h3>
                        </div>
                    </div>
                </div>
            )}

            {/* Filter & Month Navigation Bar */}
            {studentsData.length > 0 && !loading && (
                <div className="p-4 bg-slate-900/60 border-b border-slate-800/80 flex flex-col md:flex-row gap-4 items-center justify-between z-10 relative">
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        {/* Live Search Input */}
                        <div className="relative w-full sm:w-[280px]">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search ID, Student Name, Phone..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-8 py-2 text-xs font-bold text-white outline-none focus:border-emerald-500 placeholder:text-slate-500 transition-all shadow-inner"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white bg-white/10 rounded-full w-4 h-4 flex items-center justify-center"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* Payment Type Dropdown */}
                        <select
                            value={enrollmentFilter}
                            onChange={(e) => setEnrollmentFilter(e.target.value)}
                            className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-xs font-bold text-slate-300 outline-none cursor-pointer focus:border-emerald-500 transition-all"
                        >
                            <option value="ALL">All Payment Types</option>
                            <option value="FULL">Full Cards Only</option>
                            <option value="INSTALLMENT">Installments Only</option>
                            <option value="MONTHLY">Monthly Cards Only</option>
                            <option value="UPGRADE">Upgraded Payments</option>
                            <option value="HYBRID">Hybrid (Mixed) Payments</option>
                        </select>
                    </div>

                    {/* Month Navigator */}
                    {months.length > 0 && (
                        <div className="flex items-center gap-3 bg-slate-950 px-4 py-1.5 rounded-2xl border border-slate-700/80 shadow-inner">
                            <button
                                disabled={currentMonthIndex === 0}
                                onClick={() => setCurrentMonthIndex(prev => prev - 1)}
                                className="p-1.5 text-emerald-400 hover:text-emerald-300 disabled:text-slate-700 disabled:cursor-not-allowed transition-all hover:bg-emerald-500/10 rounded-xl"
                                title="Previous Month"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <div className="text-center min-w-[170px]">
                                <span className="text-[9px] uppercase font-black text-slate-500 tracking-widest block">TARGET MONTH PERIOD</span>
                                <span className="text-xs font-black text-white">{activeMonth?.name}</span>
                            </div>
                            <button
                                disabled={currentMonthIndex === months.length - 1}
                                onClick={() => setCurrentMonthIndex(prev => prev + 1)}
                                className="p-1.5 text-emerald-400 hover:text-emerald-300 disabled:text-slate-700 disabled:cursor-not-allowed transition-all hover:bg-emerald-500/10 rounded-xl"
                                title="Next Month"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Main Content Area */}
            <div className="w-full relative flex-1 bg-slate-950 flex flex-col">
                {/* Empty State when no batch is selected */}
                {!selectedBatch && !loading && (
                    <div className="p-16 text-center flex flex-col items-center justify-center gap-4 my-8">
                        <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl text-emerald-400 shadow-xl shadow-emerald-500/5 animate-pulse">
                            <Sparkles size={48} />
                        </div>
                        <h3 className="text-xl font-black text-white">Select Academic Batch to View Finance Matrix</h3>
                        <p className="text-xs text-slate-400 max-w-md">
                            Please select a Corporate Business and Academic Batch from the top header dropdowns to compile weighted student revenue metrics and payment matrices.
                        </p>
                    </div>
                )}

                {/* Table Data View */}
                {selectedBatch && (
                    <div className="overflow-auto custom-scrollbar relative max-h-[65vh] w-full">
                        {loading ? (
                            <div className="p-20 text-center flex flex-col items-center justify-center gap-3 bg-slate-950/80 backdrop-blur-sm z-50">
                                <Loader2 className="w-12 h-12 animate-spin text-emerald-400 mb-2" />
                                <p className="text-sm font-bold text-white">Compiling weighted revenue matrix nodes...</p>
                                <p className="text-xs text-slate-500">Calculating subject totals, student balances, and monthly payment distributions</p>
                            </div>
                        ) : error ? (
                            <div className="p-16 text-center text-rose-400 flex flex-col items-center justify-center gap-3">
                                <AlertCircle size={44} className="text-rose-500" />
                                <p className="text-base font-bold">{error}</p>
                                <button
                                    onClick={fetchFinanceMatrixData}
                                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all border border-slate-700"
                                >
                                    <RefreshCw size={14} /> Retry Loading
                                </button>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse min-w-max">
                                <thead>
                                    <tr className="bg-slate-900 text-xs font-black text-slate-400 uppercase tracking-wider h-[52px]">
                                        <th className="min-w-[90px] max-w-[90px] p-3.5 sticky left-0 top-0 bg-slate-900 z-[60] border-r border-b border-slate-800 text-center shadow-md">ID</th>
                                        <th className="min-w-[220px] max-w-[220px] p-3.5 sticky left-[90px] top-0 bg-slate-900 z-[60] border-r border-b border-slate-800 shadow-md">Student Info</th>
                                        <th className="min-w-[130px] max-w-[130px] p-3.5 sticky left-[310px] top-0 bg-slate-900 z-[60] border-r border-b border-slate-800 text-center shadow-md">Type</th>

                                        {subjects.map((sub, sIdx) => (
                                            <th
                                                key={sIdx}
                                                className={`min-w-[150px] max-w-[150px] whitespace-normal text-[12px] p-3.5 text-center border-b border-r border-slate-800 sticky top-0 font-bold text-white z-40 ${sIdx % 2 === 0 ? 'bg-slate-900' : 'bg-slate-900/80'}`}
                                            >
                                                {sub}
                                            </th>
                                        ))}
                                        <th className="min-w-[160px] max-w-[160px] p-3.5 text-right bg-emerald-950/90 text-emerald-400 font-black border-b border-slate-800 sticky top-0 right-0 z-50 backdrop-blur-md shadow-md">
                                            MONTHLY TOTAL
                                        </th>
                                    </tr>
                                </thead>

                                <tbody className="text-xs divide-y divide-slate-800/60 whitespace-nowrap">
                                    {processedData.slice(0, visibleCount).map((stu) => {
                                        const isHybrid = stu.type === 'Hybrid';
                                        const rowClasses = isHybrid
                                            ? "bg-fuchsia-950/20 border-y border-fuchsia-500/30 hover:bg-fuchsia-900/30 transition-colors group relative"
                                            : "hover:bg-slate-800/40 transition-colors group";

                                        let activeMonthRowTotal = 0;
                                        if (activeMonth && stu.matrixValues?.[activeMonth.id]) {
                                            subjects.forEach(sub => {
                                                activeMonthRowTotal += (stu.matrixValues[activeMonth.id][sub]?.total || 0);
                                            });
                                        }

                                        return (
                                            <tr key={stu.id} className={rowClasses}>
                                                <td className={`p-3.5 font-bold text-center sticky left-0 z-20 border-r border-slate-800/80 transition-colors ${isHybrid ? 'text-fuchsia-400 bg-slate-950 group-hover:bg-fuchsia-950/80' : 'text-emerald-400 bg-slate-950 group-hover:bg-slate-900'}`}>
                                                    {stu.studentNo}
                                                </td>
                                                <td className={`p-3.5 font-medium text-slate-200 sticky left-[90px] z-20 border-r border-slate-800/80 transition-colors ${isHybrid ? 'bg-slate-950 group-hover:bg-fuchsia-950/80' : 'bg-slate-950 group-hover:bg-slate-900'}`}>
                                                    <div className="flex flex-col gap-1 whitespace-normal">
                                                        <span className="font-bold text-white text-[14px] line-clamp-1">{stu.studentName}</span>
                                                        <span className="text-[11px] text-slate-400">Birth Year: {stu.birthYear || '-'}</span>
                                                        <span className={`text-[11px] flex flex-col font-semibold ${isHybrid ? 'text-fuchsia-400/80' : 'text-emerald-500/80'}`}>
                                                            {stu.phone && <span>P: {stu.phone}</span>}
                                                            {stu.whatsapp && stu.whatsapp !== stu.phone && <span>W: {stu.whatsapp}</span>}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className={`p-3.5 border-r border-slate-800/80 text-center sticky left-[310px] z-20 shadow-[4px_0_10px_-3px_rgba(0,0,0,0.3)] transition-colors ${isHybrid ? 'bg-slate-950 group-hover:bg-fuchsia-950/80' : 'bg-slate-950 group-hover:bg-slate-900'}`}>
                                                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black border shadow-sm inline-block ${
                                                        stu.type === 'Hybrid' ? 'bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-300' :
                                                        stu.type === 'Full' ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' :
                                                        stu.type === 'Monthly' ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' :
                                                        stu.type === 'Upgrade' ? 'bg-rose-500/20 border-rose-500/40 text-rose-300' :
                                                        'bg-amber-500/20 border-amber-500/40 text-amber-300'
                                                    }`}>
                                                        {stu.type === 'Hybrid' ? 'MIXED PAY' : stu.type?.toUpperCase()}
                                                    </span>
                                                </td>

                                                {subjects.map((sub, sIdx) => {
                                                    const cellData = activeMonth ? stu.matrixValues?.[activeMonth.id]?.[sub] : null;
                                                    return (
                                                        <td key={sIdx} className={`p-2.5 align-middle text-center border-r border-slate-800/60 transition-colors ${sIdx % 2 === 0 ? 'bg-slate-950/30' : 'bg-slate-900/30'}`}>
                                                            {cellData && (cellData.Full > 0 || cellData.Monthly > 0 || cellData.Installment > 0) ? (
                                                                <div className="flex flex-col items-center gap-1 font-semibold">
                                                                    {cellData.Full > 0 && <span className="text-[11px] bg-purple-500/20 border border-purple-500/30 text-purple-300 px-2 py-0.5 rounded-md">F: {formatCurrency(cellData.Full)}</span>}
                                                                    {cellData.Monthly > 0 && <span className="text-[11px] bg-blue-500/20 border border-blue-500/30 text-blue-300 px-2 py-0.5 rounded-md">M: {formatCurrency(cellData.Monthly)}</span>}
                                                                    {cellData.Installment > 0 && <span className="text-[11px] bg-amber-500/20 border border-amber-500/30 text-amber-300 px-2 py-0.5 rounded-md">I: {formatCurrency(cellData.Installment)}</span>}
                                                                </div>
                                                            ) : <span className="text-slate-600">-</span>}
                                                        </td>
                                                    );
                                                })}

                                                <td className={`p-3.5 text-right border-l border-emerald-500/30 sticky right-0 z-20 shadow-[-4px_0_10px_-3px_rgba(0,0,0,0.3)] ${isHybrid ? 'bg-fuchsia-950/90' : 'bg-emerald-950/80'}`}>
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className={`text-[10px] font-bold tracking-wider uppercase ${isHybrid ? 'text-fuchsia-400/80' : 'text-emerald-400/80'}`}>THIS MONTH</span>
                                                        <span className={`font-black text-xs ${isHybrid ? 'text-fuchsia-300' : 'text-emerald-300'}`}>{formatCurrency(activeMonthRowTotal)}</span>
                                                        <div className="w-full h-px bg-slate-700/50 my-0.5"></div>
                                                        <span className={`text-[10px] font-bold tracking-wider uppercase ${isHybrid ? 'text-fuchsia-400/80' : 'text-emerald-400/80'}`}>TOTAL PAID</span>
                                                        <span className={`font-black text-xs ${isHybrid ? 'text-fuchsia-100' : 'text-emerald-100'}`}>{formatCurrency(stu.totalPaid)}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {/* Footer Summary Row */}
                                    <tr className="bg-slate-900 font-bold border-t-2 border-slate-700 text-white sticky bottom-0 z-30 align-top">
                                        <td className="p-4 text-left uppercase text-xs tracking-wider text-slate-400 bg-slate-900 sticky left-0 z-40 border-r border-slate-800 shadow-[4px_0_10px_-3px_rgba(0,0,0,0.3)]" colSpan={3}>
                                            <div className="flex flex-col gap-2">
                                                <span className="font-black text-white text-xs tracking-wider">MONTHLY SUBJECT REVENUE</span>
                                                {(() => {
                                                    const overall = getOverallActiveMonthBreakdown();
                                                    const overallTotal = Object.values(overall).reduce((sum, item) => sum + item.amount, 0);
                                                    return (
                                                        <div className="flex flex-col gap-1.5 mt-1">
                                                            <span className="font-black text-emerald-400 text-base">{formatCurrency(overallTotal)}</span>
                                                            <div className="mt-2 pt-2.5 border-t border-slate-800 flex flex-col gap-1.5 text-[11px] font-normal text-left text-slate-400 tracking-normal normal-case">
                                                            {Object.entries(overall).sort((a,b) => b[1].amount - a[1].amount).map(([type, data]) => {
                                                                let colorClass = "text-slate-400";
                                                                if (type === 'Full') colorClass = "text-purple-400 font-bold";
                                                                else if (type === 'Monthly') colorClass = "text-blue-400 font-bold";
                                                                else if (type === 'Installment') colorClass = "text-amber-400 font-bold";
                                                                else if (type === 'Hybrid') colorClass = "text-fuchsia-400 font-bold";
                                                                else if (type === 'Upgrade') colorClass = "text-rose-400 font-bold";
                                                                const label = type === 'Hybrid' ? 'Mix' : type;
                                                                return (
                                                                    <div key={type} className="flex justify-between gap-4">
                                                                        <span className={colorClass}>{label} ({data.count}):</span>
                                                                        <span className="font-bold text-slate-200">{formatCurrency(data.amount)}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
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
                                                    className={`p-3.5 text-center border-r border-slate-800 text-emerald-400 z-30 ${sIdx % 2 === 0 ? 'bg-slate-900' : 'bg-slate-900/90'}`}
                                                >
                                                    <div className="flex flex-col gap-1">
                                                        <span className="font-black text-xs text-emerald-300">{formatCurrency(totalColVal)}</span>
                                                        
                                                        <div className="mt-2.5 pt-2.5 border-t border-slate-800 flex flex-col gap-1 text-[10px] font-normal text-left text-slate-300">
                                                            {Object.entries(breakdown).sort((a,b) => b[1].amount - a[1].amount).map(([type, data]) => {
                                                                let colorClass = "text-slate-400";
                                                                if (type === 'Full') colorClass = "text-purple-400";
                                                                else if (type === 'Monthly') colorClass = "text-blue-400";
                                                                else if (type === 'Installment') colorClass = "text-amber-400";
                                                                else if (type === 'Hybrid') colorClass = "text-fuchsia-400";
                                                                else if (type === 'Upgrade') colorClass = "text-rose-400";
                                                                const label = type === 'Hybrid' ? 'Mix' : (type === 'Installment' ? 'Instal' : type);
                                                                return (
                                                                    <div key={type} className="flex justify-between gap-2">
                                                                        <span className={colorClass}>{label} ({data.count}):</span>
                                                                        <span className="font-semibold">{formatCurrency(data.amount)}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </td>
                                            );
                                        })}
                                        <td className="p-4 text-right text-emerald-300 bg-emerald-950 font-black text-sm sticky right-0 z-40 shadow-[-4px_0_10px_-3px_rgba(0,0,0,0.3)] border-l border-slate-800">
                                            <div className="flex flex-col items-end gap-1">
                                                <span className="text-[10px] text-emerald-400/80 font-bold uppercase tracking-wider">GRAND TOTAL REVENUE</span>
                                                <span>{formatCurrency(grandTotal)}</span>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {/* Pagination / Load More Footer */}
                {processedData.length > visibleCount && !loading && (
                    <div className="p-4 bg-slate-900/80 border-t border-slate-800 flex justify-center">
                        <button
                            onClick={handleLoadMore}
                            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold px-5 py-2.5 rounded-2xl transition-all shadow-md active:scale-95 cursor-pointer"
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