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
    
    // 🌟 New: Search & Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [enrollmentFilter, setEnrollmentFilter] = useState('ALL');
    
    // Core Matrix Content
    const [months, setMonths] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [studentsData, setStudentsData] = useState([]);
    const [grandTotal, setGrandTotal] = useState(0);

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

    // Keyboard Scroll
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!tableContainerRef.current) return;
            if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;

            const scrollStep = 100;
            const container = tableContainerRef.current;

            switch(e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    container.scrollBy({ left: -scrollStep, behavior: 'auto' });
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    container.scrollBy({ left: scrollStep, behavior: 'auto' });
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    container.scrollBy({ top: -scrollStep, behavior: 'auto' });
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    container.scrollBy({ top: scrollStep, behavior: 'auto' });
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const resetMatrix = () => {
        setMonths([]);
        setSubjects([]);
        setStudentsData([]);
        setGrandTotal(0);
        setVisibleCount(50);
        setSearchTerm('');
        setEnrollmentFilter('ALL');
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
            
            setMonths(res.data.months || []);
            setSubjects(res.data.subjects || []);
            setStudentsData(res.data.students || []); 
            setGrandTotal(res.data.grandTotal || 0);
        } catch (err) {
            setError("Failed to gather matrix records. Double check endpoint structure.");
        } finally {
            setLoading(false);
        }
    };

    const handleLoadMore = () => {
        setVisibleCount(prev => prev + 50);
    };

    const scrollTable = (direction) => {
        if (tableContainerRef.current) {
            const amount = 300;
            tableContainerRef.current.scrollBy({
                left: direction === 'left' ? -amount : amount,
                behavior: 'smooth'
            });
        }
    };

    const formatCurrency = (val) => {
        if (!val || val === 0) return <span className="text-gray-500">-</span>;
        return new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0 }).format(val);
    };

    // 🌟 New: Search & Filter Logic Process
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

            {/* 🌟 NEW: SEARCH & FILTERS SECTION */}
            {studentsData.length > 0 && !loading && (
                <div className="p-4 bg-slate-800/30 border-b border-slate-700/50 flex flex-col sm:flex-row gap-4 items-center justify-between z-10 relative">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="relative w-full sm:w-[300px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                            <input 
                                type="text"
                                placeholder="Search by ID, Name or Phone..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all shadow-inner"
                            />
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <Filter className="text-gray-500" size={16} />
                            <select 
                                value={enrollmentFilter}
                                onChange={(e) => setEnrollmentFilter(e.target.value)}
                                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none cursor-pointer transition-all"
                            >
                                <option value="ALL">All Enrollments</option>
                                <option value="FULL">Full Payments</option>
                                <option value="MONTHLY">Monthly</option>
                                <option value="INSTALLMENT">Installments</option>
                            </select>
                        </div>
                    </div>

                    {/* Scroll Controls aligned to the right */}
                    <div className="flex items-center gap-2 px-2 bg-slate-900 rounded-lg p-1 border border-slate-700/50">
                        <span className="text-xs text-gray-400 flex items-center mr-2 px-2">Use Arrow Keys to Scroll</span>
                        <button onClick={() => scrollTable('left')} className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-md text-emerald-400 transition-colors" title="Scroll Left">
                            <ChevronLeft size={16} />
                        </button>
                        <button onClick={() => scrollTable('right')} className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-md text-emerald-400 transition-colors" title="Scroll Right">
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* 📊 MATRIX CONTAINER WITH TOP/LEFT STICKY HEADERS */}
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
                                    <th rowSpan={2} className="min-w-[140px] w-[140px] p-4 sticky left-[480px] top-0 bg-slate-950 z-[60] border-r border-b border-slate-700/50 text-center shadow-[4px_4px_15px_-3px_rgba(0,0,0,0.5)]">Enrollment</th>
                                    
                                    {/* Month Headers - STICKY TOP ONLY */}
                                    {months.map(m => (
                                        <th key={m.id} colSpan={subjects.length || 1} className="p-3 text-center border-r border-slate-700/50 bg-slate-900/95 font-bold text-emerald-400 border-b sticky top-0 z-40 backdrop-blur-md">
                                            {m.name}
                                        </th>
                                    ))}
                                    {/* Net Flow Corner Header */}
                                    <th rowSpan={2} className="min-w-[150px] p-4 text-right bg-emerald-950/95 text-emerald-400 font-bold border-l border-emerald-500/30 sticky top-0 z-50 border-b border-slate-700/50 backdrop-blur-md">Net Flow</th>
                                </tr>
                                {/* 2nd Header Layer (Subjects) - STICKY UNDER MONTHS */}
                                <tr className="bg-slate-900/95 text-[11px] text-gray-400 h-[45px]">
                                    {months.map(m => 
                                        subjects.map((sub, sIdx) => (
                                            <th key={`${m.id}-${sIdx}`} className="min-w-[120px] p-2.5 text-center font-medium border-r border-b border-slate-700/50 bg-slate-800/95 whitespace-nowrap sticky top-[60px] z-40 backdrop-blur-md" title={sub}>
                                                {sub}
                                            </th>
                                        ))
                                    )}
                                </tr>
                            </thead>
                            
                            <tbody className="text-sm divide-y divide-slate-800/50 font-normal">
                                {processedData.slice(0, visibleCount).map((stu) => (
                                    <tr key={stu.id} className="hover:bg-slate-800/40 transition-colors group">
                                        
                                        {/* 🔒 LOCKED DATA COLUMNS (STICKY LEFT ONLY) */}
                                        <td className="p-4 font-semibold text-center text-emerald-500 sticky left-0 bg-slate-900 group-hover:bg-slate-800 z-20 border-r border-slate-700/50 transition-colors">
                                            {stu.studentNo || `STU-${stu.id}`}
                                        </td>
                                        <td className="p-4 font-medium text-gray-200 sticky left-[100px] bg-slate-900 group-hover:bg-slate-800 z-20 border-r border-slate-700/50 transition-colors whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-gray-300">
                                                    {stu.studentName?.charAt(0)}
                                                </div>
                                                <span className="truncate" title={stu.studentName}>{stu.studentName}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 border-r border-slate-700/50 text-gray-400 text-xs sticky left-[320px] bg-slate-900 group-hover:bg-slate-800 z-20 transition-colors">
                                            <div className="flex flex-col gap-1.5 justify-center whitespace-nowrap">
                                                {stu.phone && <span className="flex items-center gap-1.5"><Phone size={12} className="text-gray-500"/>{stu.phone}</span>}
                                                {stu.whatsapp && stu.whatsapp !== stu.phone && <span className="flex items-center gap-1.5 text-emerald-400/90"><CheckCircle size={12}/>{stu.whatsapp}</span>}
                                            </div>
                                        </td>
                                        <td className="p-4 border-r border-slate-700/50 text-center sticky left-[480px] bg-slate-900 group-hover:bg-slate-800 z-20 shadow-[4px_0_15px_-3px_rgba(0,0,0,0.3)] transition-colors">
                                            <span className={`px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wide border ${
                                                stu.type === 'Full' ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' :
                                                stu.type === 'Monthly' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 
                                                stu.type === 'Installment' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                                                'bg-slate-500/10 border-slate-500/30 text-slate-400'
                                            }`}>
                                                {stu.type || 'N/A'}
                                            </span>
                                        </td>

                                        {/* SCROLLABLE CELLS */}
                                        {months.map(m => 
                                            subjects.map((sub, sIdx) => {
                                                const cellVal = stu.matrixValues?.[m.id]?.[sub] || 0;
                                                return (
                                                    <td key={`${m.id}-${sub}-${sIdx}`} className="p-3 text-center text-gray-300 border-r border-slate-700/50 bg-slate-950/20 group-hover:bg-transparent transition-colors">
                                                        {formatCurrency(cellVal)}
                                                    </td>
                                                );
                                            })
                                        )}

                                        {/* Student Row Net Total */}
                                        <td className="p-4 text-right font-semibold text-emerald-400 bg-emerald-950/10 border-l border-emerald-500/20">
                                            {formatCurrency(stu.totalPaid || 0)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
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