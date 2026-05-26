import React, { useState, useEffect, useRef } from 'react';
import axios from '../../api/axios';
import { Loader2, AlertCircle, Phone, ChevronDown, CheckCircle, TrendingUp, DollarSign, ChevronLeft, ChevronRight, Search, Filter } from 'lucide-react';

export default function FinanceMatrix({ loggedInUser }) {
    // Role-based configuration
    const isSystemAdmin = loggedInUser?.role?.toUpperCase() === 'SYSTEM_ADMIN' || loggedInUser?.role?.toUpperCase() === 'System Admin' || loggedInUser?.role?.toUpperCase() === 'DIRECTOR';
    const isFinanceDept = loggedInUser?.department === 'Finance';
    const canSeeAllBusinesses = isSystemAdmin || isFinanceDept;

    // Filters & Data States
    const [businesses, setBusinesses] = useState([]);
    const [batches, setBatches] = useState([]);
    const [selectedBiz, setSelectedBiz] = useState(canSeeAllBusinesses ? '' : loggedInUser?.businessId || '');
    const [selectedBatch, setSelectedBatch] = useState('');
    
    // Search & Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [enrollmentFilter, setEnrollmentFilter] = useState('ALL');
    
    // Core Matrix Content
    const [months, setMonths] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [studentsData, setStudentsData] = useState([]);
    const [grandTotal, setGrandTotal] = useState(0);

    // Active Month Filter State
    const [activeMonthIdx, setActiveMonthIdx] = useState(0);

    // Pagination/Limit State
    const [visibleCount, setVisibleCount] = useState(50);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const tableContainerRef = useRef(null);

    // Initial Load
    useEffect(() => {
        if (canSeeAllBusinesses) fetchBusinesses();
        else if (selectedBiz) fetchBatches(selectedBiz);
    }, [canSeeAllBusinesses, selectedBiz]);

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

    const resetMatrix = () => {
        setMonths([]);
        setSubjects([]);
        setStudentsData([]);
        setGrandTotal(0);
        setVisibleCount(50);
        setSearchTerm('');
        setEnrollmentFilter('ALL');
        setActiveMonthIdx(0);
    };

    // APIs
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
            
            const fetchedMonths = res.data.months || [];
            setMonths(fetchedMonths);
            setSubjects(res.data.subjects || []);
            setStudentsData(res.data.students || []); 
            setGrandTotal(res.data.grandTotal || 0);
            
            // Default to the first month in the list
            if (fetchedMonths.length > 0) {
                setActiveMonthIdx(0);
            }
        } catch (err) {
            setError("Failed to gather matrix records. Double check endpoint structure.");
        } finally {
            setLoading(false);
        }
    };

    const handleLoadMore = () => {
        setVisibleCount(prev => prev + 50);
    };

    const handleNextMonth = () => {
        if (activeMonthIdx < months.length - 1) {
            setActiveMonthIdx(prev => prev + 1);
        }
    };

    const handlePrevMonth = () => {
        if (activeMonthIdx > 0) {
            setActiveMonthIdx(prev => prev - 1);
        }
    };

    const formatCurrency = (val) => {
        if (!val || val === 0) return <span className="text-gray-500">-</span>;
        return new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0 }).format(val);
    };

    // Search & Filter Logic Process
    const processedData = studentsData.filter(stu => {
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

    // Calculate vertical total for each subject under active month
    const getSubjectTotal = (subName) => {
        if (months.length === 0 || !months[activeMonthIdx]) return 0;
        const mId = months[activeMonthIdx].id;
        return processedData.reduce((sum, stu) => sum + (stu.matrixValues?.[mId]?.[subName] || 0), 0);
    };

    return (
        <div className="w-full mt-6 bg-slate-900 border border-slate-700/50 rounded-2xl shadow-xl overflow-hidden font-sans text-gray-200 flex flex-col">
            
            {/* 🎛 TOP BAR & BATCH SELECTION */}
            <div className="p-5 bg-slate-800/50 border-b border-slate-700/50 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h2 className="text-xl font-semibold tracking-tight text-white flex items-center gap-2">
                        <TrendingUp className="text-emerald-400" size={24} />
                        Student Revenue Matrix Center
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">Advanced student-wise nested monthly allocation framework.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    {canSeeAllBusinesses && (
                        <select 
                            className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none cursor-pointer transition-all shadow-sm"
                            value={selectedBiz}
                            onChange={(e) => setSelectedBiz(e.target.value)}
                        >
                            <option value="">Select Corporate Business</option>
                            {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    )}

                    {selectedBiz && (
                        <select 
                            className="bg-slate-950 border border-emerald-500/50 rounded-lg px-4 py-2.5 text-sm text-emerald-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none cursor-pointer transition-all shadow-sm"
                            value={selectedBatch}
                            onChange={(e) => setSelectedBatch(e.target.value)}
                        >
                            <option value="">Select Academic Batch</option>
                            {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    )}
                </div>
            </div>

            {/* 🌟 SEARCH, FILTERS & ACTIVE MONTH NAVIGATION */}
            {studentsData.length > 0 && !loading && (
                <div className="p-4 bg-slate-800/30 border-b border-slate-700/50 flex flex-col xl:flex-row gap-4 items-center justify-between z-10 relative">
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
                        <div className="relative w-full sm:w-[260px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                            <input 
                                type="text"
                                placeholder="Search ID, Name or Phone..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all shadow-inner"
                            />
                        </div>
                        
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Filter className="text-gray-500 shrink-0" size={16} />
                            <select 
                                value={enrollmentFilter}
                                onChange={(e) => setEnrollmentFilter(e.target.value)}
                                className="w-full sm:w-auto bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none cursor-pointer transition-all"
                            >
                                <option value="ALL">All Enrollments</option>
                                <option value="FULL">Full Payments</option>
                                <option value="MONTHLY">Monthly</option>
                                <option value="INSTALLMENT">Installments</option>
                            </select>
                        </div>
                    </div>

                    {/* 🗓️ MONTH NAVIGATOR (NO MORE SCROLL NEEDED) */}
                    <div className="flex items-center gap-3 px-3 py-1.5 bg-slate-950 rounded-xl border border-slate-700/50 shadow-inner w-full sm:w-auto justify-between sm:justify-start">
                        <button 
                            onClick={handlePrevMonth} 
                            disabled={activeMonthIdx === 0}
                            className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-20 disabled:hover:bg-slate-800 border border-slate-600 rounded-lg text-emerald-400 transition-all outline-none cursor-pointer" 
                            title="Previous Month"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        
                        <div className="px-4 text-center min-w-[160px]">
                            <span className="text-[10px] text-gray-500 font-bold uppercase block tracking-widest">Active Report Month</span>
                            <span className="text-sm font-extrabold text-emerald-400 tracking-wide block drop-shadow-[0_0_10px_rgba(52,211,153,0.2)]">
                                {months[activeMonthIdx]?.name || 'N/A'}
                            </span>
                        </div>

                        <button 
                            onClick={handleNextMonth} 
                            disabled={activeMonthIdx === months.length - 1}
                            className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-20 disabled:hover:bg-slate-800 border border-slate-600 rounded-lg text-emerald-400 transition-all outline-none cursor-pointer" 
                            title="Next Month"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            )}

            {/* 📊 CLUTTER-FREE MATRIX CONTAINER WITH TOP/LEFT STICKY HEADERS */}
            <div className="w-full relative flex-1 bg-slate-900 flex flex-col">
                <div 
                    ref={tableContainerRef}
                    className="overflow-auto custom-scrollbar relative min-h-[400px] max-h-[65vh]" 
                    tabIndex={0}
                >
                    {loading && studentsData.length === 0 ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm z-50">
                            <Loader2 className="w-10 h-10 animate-spin text-emerald-400 mb-3" />
                            <p className="text-sm text-gray-400 font-medium">Compiling complex rows & structures...</p>
                        </div>
                    ) : error ? (
                        <div className="p-12 text-center text-red-400 flex flex-col items-center justify-center gap-3">
                            <AlertCircle size={40} className="text-red-500" />
                            <p className="text-base font-medium">{error}</p>
                        </div>
                    ) : processedData.length === 0 ? (
                        <div className="p-20 text-center text-gray-500 flex flex-col items-center justify-center gap-3 h-full">
                            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-2">
                                <DollarSign size={32} className="text-gray-600" />
                            </div>
                            <p className="text-base font-medium text-gray-400">
                                {studentsData.length > 0 ? "No records matched your search/filter criteria." : "No synchronized payment nodes active for this query."}
                            </p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse border-spacing-0">
                            <thead>
                                {/* 1st Header Layer - STICKY TOP */}
                                <tr className="bg-slate-950 text-xs font-semibold text-gray-300 uppercase tracking-wide h-[60px]">
                                    {/* 🔒 LOCKED CORNER CELLS (STICKY TOP & LEFT) */}
                                    <th rowSpan={2} className="min-w-[100px] w-[100px] p-4 sticky left-0 top-0 bg-slate-950 z-[60] border-r border-b border-slate-700/50 text-center shadow-[4px_4px_15px_-3px_rgba(0,0,0,0.4)]">ID</th>
                                    <th rowSpan={2} className="min-w-[220px] w-[220px] p-4 sticky left-[100px] top-0 bg-slate-950 z-[60] border-r border-b border-slate-700/50 shadow-[4px_4px_15px_-3px_rgba(0,0,0,0.4)]">Student Details</th>
                                    <th rowSpan={2} className="min-w-[160px] w-[160px] p-4 sticky left-[320px] top-0 bg-slate-950 z-[60] border-r border-b border-slate-700/50 text-center shadow-[4px_4px_15px_-3px_rgba(0,0,0,0.4)]">Contact Nodes</th>
                                    <th rowSpan={2} className="min-w-[90px] w-[90px] p-4 sticky left-[480px] top-0 bg-slate-950 z-[60] border-r border-b border-slate-700/50 text-center shadow-[4px_4px_15px_-3px_rgba(0,0,0,0.4)]">Birth Year</th>
                                    <th rowSpan={2} className="min-w-[130px] w-[130px] p-4 sticky left-[570px] top-0 bg-slate-950 z-[60] border-r border-b border-slate-700/50 text-center shadow-[4px_4px_15px_-3px_rgba(0,0,0,0.5)]">Enrollment</th>
                                    
                                    {/* Selected Month Header - STICKY TOP ONLY */}
                                    {months[activeMonthIdx] && (
                                        <th colSpan={subjects.length || 1} className="p-3 text-center border-r border-slate-700/50 bg-slate-900/95 font-bold text-emerald-400 border-b sticky top-0 z-40 backdrop-blur-md">
                                            {months[activeMonthIdx].name}
                                        </th>
                                    )}
                                    {/* Net Flow Corner Header */}
                                    <th rowSpan={2} className="min-w-[150px] p-4 text-right bg-emerald-950/95 text-emerald-400 font-bold border-l border-emerald-500/30 sticky top-0 z-50 border-b border-slate-700/50 backdrop-blur-md">Net Flow</th>
                                </tr>
                                {/* 2nd Header Layer (Subjects) - STICKY UNDER MONTHS */}
                                <tr className="bg-slate-900/95 text-[11px] text-gray-400 h-[45px]">
                                    {months[activeMonthIdx] && subjects.map((sub, sIdx) => (
                                        <th key={`${months[activeMonthIdx].id}-${sIdx}`} className="min-w-[120px] p-2.5 text-center font-medium border-r border-b border-slate-700/50 bg-slate-800/95 whitespace-nowrap sticky top-[60px] z-40 backdrop-blur-md" title={sub}>
                                            {sub}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            
                            <tbody className="text-sm divide-y divide-slate-800/50 font-normal">
                                {processedData.slice(0, visibleCount).map((stu) => (
                                    <tr key={stu.id} className="even:bg-slate-900/60 odd:bg-slate-950/40 hover:bg-slate-800/40 transition-colors group">
                                        
                                        {/* 🔒 STICKY DATA COLUMNS WITH INHERITED BACKGROUNDS */}
                                        <td className="p-4 font-semibold text-center text-emerald-500 sticky left-0 bg-inherit group-hover:bg-slate-800/95 z-20 border-r border-slate-700/50 transition-colors">
                                            {stu.studentNo || `STU-${stu.id}`}
                                        </td>
                                        <td className="p-4 font-medium text-gray-200 sticky left-[100px] bg-inherit group-hover:bg-slate-800/95 z-20 border-r border-slate-700/50 transition-colors whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-gray-300">
                                                    {stu.studentName?.charAt(0)}
                                                </div>
                                                <span className="truncate" title={stu.studentName}>{stu.studentName}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 border-r border-slate-700/50 text-gray-400 text-xs sticky left-[320px] bg-inherit group-hover:bg-slate-800/95 z-20 transition-colors">
                                            <div className="flex flex-col gap-1.5 justify-center whitespace-nowrap">
                                                {stu.phone && <span className="flex items-center gap-1.5"><Phone size={12} className="text-gray-500"/>{stu.phone}</span>}
                                                {stu.whatsapp && stu.whatsapp !== stu.phone && <span className="flex items-center gap-1.5 text-emerald-400/90"><CheckCircle size={12}/>{stu.whatsapp}</span>}
                                            </div>
                                        </td>
                                        <td className="p-4 border-r border-slate-700/50 text-center sticky left-[480px] bg-inherit group-hover:bg-slate-800/95 z-20 transition-colors text-gray-300 font-medium">
                                            {stu.birthYear || 'N/A'}
                                        </td>
                                        <td className="p-4 border-r border-slate-700/50 text-center sticky left-[570px] bg-inherit group-hover:bg-slate-800/95 z-20 shadow-[4px_0_15px_-3px_rgba(0,0,0,0.3)] transition-colors">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
                                                    stu.type === 'Full' ? 'bg-purple-500/15 border-purple-500/35 text-purple-400' :
                                                    stu.type === 'Monthly' ? 'bg-blue-500/15 border-blue-500/35 text-blue-400' : 
                                                    stu.type === 'Installment' ? 'bg-amber-500/15 border-amber-500/35 text-amber-400' :
                                                    'bg-slate-500/15 border-slate-500/35 text-slate-400'
                                                }`}>
                                                    {stu.type || 'N/A'}
                                                </span>
                                                {stu.isHybrid && (
                                                    <span className="text-[9px] font-black bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded border border-rose-500/30 uppercase tracking-wider animate-pulse">
                                                        Hybrid (Mixed)
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* SCROLLABLE CELLS (ACTIVE MONTH ONLY) */}
                                        {months[activeMonthIdx] && subjects.map((sub, sIdx) => {
                                            const cellVal = stu.matrixValues?.[months[activeMonthIdx].id]?.[sub] || 0;
                                            return (
                                                <td key={`${months[activeMonthIdx].id}-${sub}-${sIdx}`} className="p-3 text-center text-gray-300 border-r border-slate-700/50 bg-slate-950/10 group-hover:bg-transparent transition-colors">
                                                    {formatCurrency(cellVal)}
                                                </td>
                                            );
                                        })}

                                        {/* Student Row Net Total */}
                                        <td className="p-4 text-right font-semibold text-emerald-400 bg-emerald-950/10 border-l border-emerald-500/20">
                                            {formatCurrency(stu.totalPaid || 0)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            
                            {/* 📊 DYNAMIC MATRIX AGGREGATIONS FOOTER */}
                            <tfoot>
                                <tr className="bg-slate-950 font-bold text-gray-200 border-t border-slate-700/60 text-xs h-[50px] shadow-[0_-4px_15px_rgba(0,0,0,0.5)]">
                                    <td colSpan={5} className="p-4 text-center border-r border-slate-700/50 sticky left-0 bg-slate-950 z-30 shadow-[4px_0_15px_-3px_rgba(0,0,0,0.5)] uppercase tracking-wider font-extrabold text-indigo-400">
                                        Active Month Column Aggregates
                                    </td>
                                    {months[activeMonthIdx] && subjects.map((sub, sIdx) => {
                                        const subTotal = getSubjectTotal(sub);
                                        return (
                                            <td key={`total-${sub}-${sIdx}`} className="p-3 text-center border-r border-slate-700/50 text-emerald-400 bg-emerald-950/20 font-bold text-sm">
                                                {formatCurrency(subTotal)}
                                            </td>
                                        );
                                    })}
                                    <td className="p-4 text-right text-lg font-black text-emerald-300 bg-emerald-950/30 border-l border-emerald-500/40 shadow-inner">
                                        {formatCurrency(processedData.reduce((sum, stu) => sum + (stu.totalPaid || 0), 0))}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    )}
                </div>

                {/* 🔄 LOAD MORE BUTTON TRIGGER */}
                {processedData.length > visibleCount && !loading && (
                    <div className="p-6 bg-slate-950/50 border-t border-slate-700/50 flex justify-center">
                        <button 
                            onClick={handleLoadMore}
                            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-gray-200 text-sm font-medium px-6 py-2.5 rounded-lg active:scale-95 transition-all shadow-md hover:shadow-lg"
                        >
                            <ChevronDown size={16} className="animate-bounce text-emerald-400" />
                            Load More Records ({visibleCount} of {processedData.length} Shown)
                        </button>
                    </div>
                )}
                
                {/* Summary Grand Total strip */}
                {studentsData.length > 0 && !loading && (
                    <div className="p-5 bg-slate-950 border-t border-slate-700/50 flex flex-col sm:flex-row justify-between items-center gap-3 px-6 z-10">
                        <span className="text-sm font-semibold uppercase tracking-wider text-gray-400">Aggregated Batch Gross Flow</span>
                        <span className="text-xl font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-5 py-2 rounded-xl shadow-inner">
                            {new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(grandTotal)}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}