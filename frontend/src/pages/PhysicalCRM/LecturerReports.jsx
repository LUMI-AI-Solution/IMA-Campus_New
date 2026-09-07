import React, { useState, useEffect, useRef } from 'react';
import { format, subMonths, addMonths, parseISO } from 'date-fns';
import { printThermalReceipt } from '../../utils/thermalReceiptPrinter';
import { 
  Users, 
  BookOpen, 
  Search, 
  Calendar, 
  DollarSign, 
  FileText, 
  Printer, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ChevronRight, 
  ArrowLeft, 
  Percent, 
  TrendingUp, 
  Layers, 
  RefreshCw, 
  Sparkles,
  CreditCard,
  Phone,
  MessageSquare,
  Filter,
  Check,
  X,
  ChevronDown,
  GraduationCap
} from 'lucide-react';
import physicalCrmService from '../../api/physicalCrm';
import LecturerInvoiceModal from '../../components/PhysicalCRM/LecturerInvoiceModal';
import { toast } from 'react-hot-toast';

// Robust Teacher Image URL Helper matching ClassTeacherManagement.jsx
const getTeacherImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('data:image') || imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  let apiBase = '';
  if (import.meta.env.VITE_API_URL) {
    apiBase = import.meta.env.VITE_API_URL;
  } else {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('10.') || hostname.startsWith('192.168.') || hostname.startsWith('172.')) {
      apiBase = `http://${hostname}:5000/api`;
    } else if (window.location.protocol === 'https:') {
      apiBase = `https://${hostname}/api`;
    } else {
      apiBase = `http://${hostname}:5000/api`;
    }
  }

  const backendHost = apiBase.replace(/\/api\/?$/, '');
  const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `${backendHost}${cleanPath}`;
};

export default function LecturerReports() {
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  
  // Selected Teacher for Drilldown
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState('ALL');
  const [selectedMonth, setSelectedMonth] = useState('');
  
  // Teacher Report Details State
  const [reportData, setReportData] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // Class Fee Matrix State (for full calendar grid view)
  const [feeMatrixData, setFeeMatrixData] = useState(null);
  const [loadingMatrix, setLoadingMatrix] = useState(false);

  // View Mode for Details: 'roster' | 'matrix'
  const [viewMode, setViewMode] = useState('roster');

  // Search & Filters
  const [teacherSearch, setTeacherSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PAID' | 'PENDING' | 'FREE_CARD'

  // Custom Dropdown Open States
  const [classDropdownOpen, setClassDropdownOpen] = useState(false);
  const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  const classDropdownRef = useRef(null);
  const monthDropdownRef = useRef(null);
  const statusDropdownRef = useRef(null);

  // Invoice Modal State
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (classDropdownRef.current && !classDropdownRef.current.contains(e.target)) {
        setClassDropdownOpen(false);
      }
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(e.target)) {
        setMonthDropdownOpen(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target)) {
        setStatusDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [tchRes, clsRes] = await Promise.all([
        physicalCrmService.getTeachers(),
        physicalCrmService.getClasses()
      ]);
      setTeachers(tchRes || []);
      setClasses(clsRes || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load lecturers and classes');
    } finally {
      setLoading(false);
    }
  };

  // Helper: Format YYYY-MM to readable month (e.g. 2025-01 -> Jan 2025)
  const formatMonthYear = (mStr) => {
    if (!mStr) return '';
    try {
      const [year, month] = mStr.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } catch (e) {
      return mStr;
    }
  };

  // Fetch Report for selected Teacher
  const loadTeacherReport = async (teacherId, month = selectedMonth, classId = selectedClassId) => {
    setLoadingReport(true);
    try {
      const res = await physicalCrmService.getTeacherReports(teacherId, {
        month: month || undefined,
        classId: classId !== 'ALL' ? classId : undefined
      });
      setReportData(res);
      if (!selectedMonth && res.selectedMonth) {
        setSelectedMonth(res.selectedMonth);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load lecturer report');
    } finally {
      setLoadingReport(false);
    }
  };

  // Fetch Full Fee Matrix for Class Calendar view
  const loadClassMatrix = async (classId) => {
    if (!classId || classId === 'ALL') {
      setFeeMatrixData(null);
      return;
    }
    setLoadingMatrix(true);
    try {
      const res = await physicalCrmService.getClassFeeMatrix(classId);
      setFeeMatrixData(res);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load class fee calendar matrix');
    } finally {
      setLoadingMatrix(false);
    }
  };

  // Select Teacher to Drilldown
  const handleSelectTeacher = (teacher) => {
    setSelectedTeacher(teacher);
    setSelectedClassId('ALL');
    setSelectedMonth('');
    setStudentSearch('');
    setViewMode('roster');
    loadTeacherReport(teacher.id, '', 'ALL');
  };

  // Handle Class Dropdown Change
  const handleClassChange = (classId) => {
    setSelectedClassId(classId);
    setClassDropdownOpen(false);
    if (selectedTeacher) {
      loadTeacherReport(selectedTeacher.id, selectedMonth, classId);
      if (classId !== 'ALL') {
        loadClassMatrix(classId);
      } else {
        setFeeMatrixData(null);
        setViewMode('roster');
      }
    }
  };

  // Handle Month Change
  const handleMonthChange = (month) => {
    setSelectedMonth(month);
    setMonthDropdownOpen(false);
    if (selectedTeacher) {
      loadTeacherReport(selectedTeacher.id, month, selectedClassId);
    }
  };

  // 1-Click Fee Toggle with Thermal Receipt
  const handleToggleFeeStatus = async (studentId, classId, month, currentStatus) => {
    const nextStatus = currentStatus === 'PAID' ? 'PENDING' : 'PAID';
    try {
      const res = await physicalCrmService.toggleFeePayment({
        studentId,
        classId,
        month,
        status: nextStatus
      });
      toast.success(`Fee updated for ${formatMonthYear(month)}: ${nextStatus}`);

      if (nextStatus === 'PAID' && res?.receiptData) {
        printThermalReceipt(res.receiptData);
      }
      
      // Refresh current views
      if (selectedTeacher) {
        loadTeacherReport(selectedTeacher.id, selectedMonth, selectedClassId);
      }
      if (selectedClassId && selectedClassId !== 'ALL') {
        loadClassMatrix(selectedClassId);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to toggle fee payment status');
    }
  };

  // Filtered Lecturers List for Directory
  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(teacherSearch.toLowerCase()) ||
    (t.phone && t.phone.includes(teacherSearch)) ||
    (t.classes && t.classes.some(c => c.name.toLowerCase().includes(teacherSearch.toLowerCase())))
  );

  // Active class name helper
  const getSelectedClassName = () => {
    if (selectedClassId === 'ALL') {
      return `All Assigned Classes (${reportData?.teacher?.classes?.length || 0})`;
    }
    const found = reportData?.teacher?.classes?.find(c => c.id === parseInt(selectedClassId));
    return found ? `${found.name} (${found.grade})` : 'Select Class';
  };

  return (
    <div className="space-y-6 w-full min-h-full pb-16 font-sans text-slate-100">
      
      {/* ========================================================================= */}
      {/* VIEW 1: TOP-LEVEL LECTURER DIRECTORY & CARDS                              */}
      {/* ========================================================================= */}
      {!selectedTeacher && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl shadow-xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-2xl">
                <FileText size={26} />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">
                  Lecturer Reports & Monthly Invoices
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select a lecturer to view student fee collections, institute cut deductions, and generate executive payout invoices.
                </p>
              </div>
            </div>

            {/* High Level Stats in Header */}
            <div className="flex items-center gap-3">
              <div className="bg-slate-800/90 border border-slate-700/80 px-4 py-2 rounded-2xl text-center shadow-inner">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Lecturers</span>
                <span className="text-lg font-black text-white">{teachers.length}</span>
              </div>
              <div className="bg-slate-800/90 border border-slate-700/80 px-4 py-2 rounded-2xl text-center shadow-inner">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Classes</span>
                <span className="text-lg font-black text-blue-400">{classes.length}</span>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search lecturers by name, phone, or class subject..."
              value={teacherSearch}
              onChange={(e) => setTeacherSearch(e.target.value)}
              className="w-full pl-11 pr-10 py-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500 transition-all shadow-inner"
            />
            {teacherSearch && (
              <button 
                onClick={() => setTeacherSearch('')} 
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Lecturer Directory Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTeachers.map(t => {
              const imgUrl = getTeacherImageUrl(t.image);
              return (
                <div
                  key={t.id}
                  onClick={() => handleSelectTeacher(t)}
                  className="bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/50 p-5 rounded-3xl shadow-lg hover:shadow-blue-500/10 cursor-pointer transition-all duration-200 group flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: Photo + Name + Contact */}
                    <div className="flex items-center gap-4 mb-4">
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={t.name}
                          className="w-16 h-16 rounded-2xl object-cover border border-slate-700 group-hover:border-blue-400 shadow-md transition-all shrink-0 bg-slate-800"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(t.name)}&background=1e293b&color=38bdf8&bold=true`;
                          }}
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl font-black text-blue-400 shadow-md shrink-0">
                          {t.name.charAt(0)}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-extrabold text-white group-hover:text-blue-400 transition-colors truncate">
                          {t.name}
                        </h3>
                        <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <Phone size={12} className="text-blue-400" /> {t.phone || t.whatsapp || 'No contact set'}
                        </p>
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold">
                            Inst. Cut: {t.instituteCut || 0}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Assigned Classes */}
                    <div className="space-y-1.5 mb-4">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        Assigned Classes ({t.classes?.length || 0})
                      </span>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1 custom-scrollbar">
                        {t.classes && t.classes.length > 0 ? (
                          t.classes.map(c => (
                            <span key={c.id} className="text-[11px] font-medium bg-slate-800 text-slate-300 px-2.5 py-1 rounded-xl border border-slate-700/70">
                              {c.name} <strong className="text-blue-400 font-semibold">({c.grade})</strong>
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500 italic">No classes assigned</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom CTA */}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-bold text-blue-400 group-hover:text-blue-300">
                    <span>View Breakdown & Invoice</span>
                    <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}

            {filteredTeachers.length === 0 && (
              <div className="col-span-full text-center py-16 bg-slate-900/40 rounded-3xl border border-slate-800 text-slate-400 italic">
                No lecturers match the search query "{teacherSearch}".
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: DETAILED LECTURER BREAKDOWN & INVOICE GENERATOR                   */}
      {/* ========================================================================= */}
      {selectedTeacher && reportData && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Back Button & Top Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setSelectedTeacher(null);
                setReportData(null);
                setFeeMatrixData(null);
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-slate-700 shadow-sm"
            >
              <ArrowLeft size={15} /> Back to Lecturer Directory
            </button>

            <span className="text-xs font-bold text-slate-400 bg-slate-900 px-3.5 py-1.5 rounded-full border border-slate-800">
              Lecturer Remittance Portal
            </span>
          </div>

          {/* Lecturer Profile Hero Card */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-6 md:p-7 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            
            {/* Left: Avatar & Info */}
            <div className="flex items-center gap-5">
              {reportData.teacher.image ? (
                <img
                  src={getTeacherImageUrl(reportData.teacher.image)}
                  alt={reportData.teacher.name}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-700 shadow-lg shrink-0 bg-slate-800"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(reportData.teacher.name)}&background=1e293b&color=38bdf8&bold=true`;
                  }}
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-3xl font-black text-blue-400 shadow-lg shrink-0">
                  {reportData.teacher.name.charAt(0)}
                </div>
              )}

              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400 block mb-0.5">
                  Academic Lecturer
                </span>
                <h2 className="text-2xl font-black text-white tracking-tight">
                  {reportData.teacher.name}
                </h2>
                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-400">
                  {reportData.teacher.phone && (
                    <span className="flex items-center gap-1">
                      <Phone size={12} className="text-blue-400" /> {reportData.teacher.phone}
                    </span>
                  )}
                  {reportData.teacher.whatsapp && (
                    <span className="flex items-center gap-1 text-emerald-400">
                      <MessageSquare size={12} /> {reportData.teacher.whatsapp}
                    </span>
                  )}
                  <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 text-[11px]">
                    Institute Cut: {reportData.teacher.instituteCut}%
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Generate Invoice CTA */}
            <div className="w-full md:w-auto">
              <button
                onClick={() => setIsInvoiceOpen(true)}
                className="w-full md:w-auto px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2.5"
              >
                <FileText size={18} /> Generate Month-End Payout Invoice
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* CUSTOM HIGH-CONTRAST FILTER BAR (WITH CUSTOM CLICKABLE DROPDOWNS)        */}
          {/* ========================================================================= */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center relative z-20">
            
            {/* 1. Class Dropdown Menu (Custom Headless Component with 100% visible white text) */}
            <div className="lg:col-span-4 relative" ref={classDropdownRef}>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Filter by Class</label>
              
              <button
                type="button"
                onClick={() => setClassDropdownOpen(!classDropdownOpen)}
                className="w-full px-3.5 py-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl text-xs font-bold text-white flex items-center justify-between outline-none focus:border-blue-500 transition-all shadow-sm text-left"
              >
                <span className="truncate pr-2">{getSelectedClassName()}</span>
                <ChevronDown size={15} className={`text-slate-400 transition-transform ${classDropdownOpen ? 'rotate-180 text-blue-400' : ''}`} />
              </button>

              {classDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50 py-1.5 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-150">
                  <div
                    onClick={() => handleClassChange('ALL')}
                    className={`px-3.5 py-2.5 text-xs font-semibold cursor-pointer flex items-center justify-between transition-colors ${selectedClassId === 'ALL' ? 'bg-blue-600/20 text-blue-400 font-bold' : 'text-slate-200 hover:bg-slate-800 hover:text-white'}`}
                  >
                    <span>All Assigned Classes ({reportData.teacher.classes?.length || 0})</span>
                    {selectedClassId === 'ALL' && <Check size={14} className="text-blue-400" />}
                  </div>

                  {reportData.teacher.classes && reportData.teacher.classes.map(c => (
                    <div
                      key={c.id}
                      onClick={() => handleClassChange(c.id.toString())}
                      className={`px-3.5 py-2.5 text-xs font-semibold cursor-pointer flex items-center justify-between transition-colors ${selectedClassId === c.id.toString() ? 'bg-blue-600/20 text-blue-400 font-bold' : 'text-slate-200 hover:bg-slate-800 hover:text-white'}`}
                    >
                      <span className="truncate">{c.name} <strong className="text-slate-400 font-normal">({c.grade})</strong></span>
                      {selectedClassId === c.id.toString() && <Check size={14} className="text-blue-400" />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Active Billing Month Dropdown */}
            <div className="lg:col-span-3 relative" ref={monthDropdownRef}>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Billing Month</label>
              
              <button
                type="button"
                onClick={() => setMonthDropdownOpen(!monthDropdownOpen)}
                className="w-full px-3.5 py-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl text-xs font-bold text-white flex items-center justify-between outline-none focus:border-blue-500 transition-all shadow-sm text-left"
              >
                <span className="truncate pr-2">{formatMonthYear(selectedMonth)} ({selectedMonth})</span>
                <ChevronDown size={15} className={`text-slate-400 transition-transform ${monthDropdownOpen ? 'rotate-180 text-blue-400' : ''}`} />
              </button>

              {monthDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50 py-1.5 max-h-56 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-150">
                  {reportData.availableMonths && reportData.availableMonths.length > 0 ? (
                    reportData.availableMonths.map(m => (
                      <div
                        key={m}
                        onClick={() => handleMonthChange(m)}
                        className={`px-3.5 py-2 text-xs font-semibold cursor-pointer flex items-center justify-between transition-colors ${selectedMonth === m ? 'bg-blue-600/20 text-blue-400 font-bold' : 'text-slate-200 hover:bg-slate-800 hover:text-white'}`}
                      >
                        <span>{formatMonthYear(m)} ({m})</span>
                        {selectedMonth === m && <Check size={14} className="text-blue-400" />}
                      </div>
                    ))
                  ) : (
                    <div className="px-3.5 py-2 text-xs text-slate-400 italic">No months available</div>
                  )}
                </div>
              )}
            </div>

            {/* 3. Fee Status Filter */}
            <div className="lg:col-span-2 relative" ref={statusDropdownRef}>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</label>
              
              <button
                type="button"
                onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                className="w-full px-3 py-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl text-xs font-bold text-white flex items-center justify-between outline-none focus:border-blue-500 transition-all shadow-sm text-left"
              >
                <span className="truncate pr-1">
                  {statusFilter === 'ALL' ? 'All Statuses' : (statusFilter === 'PAID' ? 'Paid Only' : (statusFilter === 'PENDING' ? 'Pending Only' : 'Free Card'))}
                </span>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${statusDropdownOpen ? 'rotate-180 text-blue-400' : ''}`} />
              </button>

              {statusDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50 py-1 max-h-48 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-150">
                  {[
                    { val: 'ALL', label: 'All Statuses' },
                    { val: 'PAID', label: 'Paid Only' },
                    { val: 'PENDING', label: 'Pending Only' },
                    { val: 'FREE_CARD', label: 'Free Card' }
                  ].map(opt => (
                    <div
                      key={opt.val}
                      onClick={() => { setStatusFilter(opt.val); setStatusDropdownOpen(false); }}
                      className={`px-3 py-2 text-xs font-semibold cursor-pointer flex items-center justify-between transition-colors ${statusFilter === opt.val ? 'bg-blue-600/20 text-blue-400 font-bold' : 'text-slate-200 hover:bg-slate-800 hover:text-white'}`}
                    >
                      <span>{opt.label}</span>
                      {statusFilter === opt.val && <Check size={14} className="text-blue-400" />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Student Search Input */}
            <div className="lg:col-span-3">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Search Student</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ID, Name, Phone..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 outline-none focus:border-blue-500 transition-all"
                />
              </div>
            </div>

          </div>

          {/* Financial & Operational KPI Cards (Clean Typography - Zero Monospace) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            
            {/* 1. Enrolled Students */}
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Enrolled
              </span>
              <h3 className="text-2xl font-extrabold text-white mt-1 tracking-tight">
                {reportData.summary.totalEnrolledStudents}
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Registered students</p>
            </div>

            {/* 2. Paid Students */}
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-sm">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                Paid Count
              </span>
              <h3 className="text-2xl font-extrabold text-emerald-400 mt-1 tracking-tight">
                {reportData.summary.totalPaidStudents}
                <span className="text-xs text-slate-400 font-semibold ml-2">
                  ({reportData.summary.totalEnrolledStudents > 0 ? Math.round((reportData.summary.totalPaidStudents / reportData.summary.totalEnrolledStudents) * 100) : 0}%)
                </span>
              </h3>
              <p className="text-[10px] text-amber-400 mt-0.5 font-medium">
                Unpaid: {reportData.summary.totalUnpaidStudents}
              </p>
            </div>

            {/* 3. Gross Revenue */}
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Gross Collections
              </span>
              <h3 className="text-2xl font-extrabold text-white mt-1 tracking-tight">
                Rs. {reportData.summary.grossRevenue.toLocaleString()}
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">{formatMonthYear(selectedMonth)} fee collections</p>
            </div>

            {/* 4. Institute Cut */}
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-sm">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                Institute Cut ({reportData.summary.instituteCutPercent}%)
              </span>
              <h3 className="text-2xl font-extrabold text-amber-400 mt-1 tracking-tight">
                - Rs. {reportData.summary.instituteCutAmount.toLocaleString()}
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Deducted cut</p>
            </div>

            {/* 5. NET LECTURER PAYOUT */}
            <div className="bg-emerald-950/40 border-2 border-emerald-500/50 p-4 rounded-2xl shadow-md">
              <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wider block">
                Net Lecturer Payout
              </span>
              <h3 className="text-2xl font-black text-emerald-300 mt-1 tracking-tight">
                Rs. {reportData.summary.netTeacherPayout.toLocaleString()}
              </h3>
              <p className="text-[10px] text-emerald-400/80 mt-0.5 font-semibold">Actual net remittance</p>
            </div>

          </div>

          {/* View Mode Switcher (If a specific class is selected, can toggle between Student Roster and Full Calendar Matrix) */}
          {selectedClassId !== 'ALL' && feeMatrixData && (
            <div className="flex items-center justify-between bg-slate-900/60 p-2 rounded-2xl border border-slate-800">
              <span className="text-xs font-bold text-slate-400 ml-2">Class Display View:</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setViewMode('roster')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${viewMode === 'roster' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                >
                  Student List ({formatMonthYear(selectedMonth)})
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('matrix')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${viewMode === 'matrix' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                >
                  Full Calendar Fee Matrix Grid
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION: FULL CALENDAR / MATRIX GRID (SHOWN IN MATRIX MODE)               */}
          {/* ========================================================================= */}
          {selectedClassId !== 'ALL' && feeMatrixData && viewMode === 'matrix' && (
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-5 rounded-3xl shadow-xl space-y-4">
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Calendar size={18} className="text-blue-400" />
                    Interactive Month-by-Month Fee Calendar Matrix
                  </h3>
                  <p className="text-xs text-slate-400">
                    Click any cell to toggle payment status between PAID and PENDING.
                  </p>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto custom-scrollbar border border-slate-800 rounded-2xl">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-slate-300 font-bold border-b border-slate-700 text-[11px]">
                      <th className="p-3 sticky left-0 bg-slate-900 z-10 min-w-[200px]">Student Details</th>
                      <th className="p-3 text-center min-w-[90px]">Reg Fee</th>
                      {feeMatrixData.activeMonths && feeMatrixData.activeMonths.map(m => (
                        <th key={m} className={`p-3 text-center min-w-[110px] ${m === selectedMonth ? 'bg-blue-600/20 text-blue-300 font-black border-x border-blue-500/20' : ''}`}>
                          {formatMonthYear(m)}
                        </th>
                      ))}
                      <th className="p-3 text-center min-w-[90px]">Paid Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200">
                    {feeMatrixData.students && feeMatrixData.students
                      .filter(st => 
                        st.studentId.toLowerCase().includes(studentSearch.toLowerCase()) ||
                        st.studentName.toLowerCase().includes(studentSearch.toLowerCase()) ||
                        (st.phone && st.phone.includes(studentSearch))
                      )
                      .map((st, idx) => (
                        <tr key={`matrix_${feeMatrixData.class.id}_${st.id}_${idx}`} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3 sticky left-0 bg-slate-900/95 z-10 border-r border-slate-800">
                            <span className="font-semibold text-sky-400 block tracking-tight">{st.studentId}</span>
                            <span className="text-white font-semibold block">{st.studentName}</span>
                            {st.phone && <span className="text-[10px] text-slate-400 block">{st.phone}</span>}
                          </td>

                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${st.registrationFeeStatus === 'PAID' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                              {st.registrationFeeStatus}
                            </span>
                          </td>

                          {feeMatrixData.activeMonths && feeMatrixData.activeMonths.map(m => {
                            const mData = st.months?.[m];
                            const isPaid = mData?.status === 'PAID';
                            const isFree = mData?.status === 'FREE_CARD';

                            return (
                              <td key={m} className={`p-2 text-center ${m === selectedMonth ? 'bg-blue-500/5' : ''}`}>
                                <button
                                  type="button"
                                  onClick={() => handleToggleFeeStatus(st.id, feeMatrixData.class.id, m, mData?.status)}
                                  className={`w-full py-1.5 px-2 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${
                                    isPaid 
                                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm' 
                                      : (isFree 
                                          ? 'bg-purple-600 text-white' 
                                          : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700')
                                  }`}
                                >
                                  {isPaid ? (
                                    <>
                                      <Check size={11} /> PAID
                                    </>
                                  ) : (
                                    <span>PENDING</span>
                                  )}
                                </button>
                              </td>
                            );
                          })}

                          <td className="p-3 text-center font-bold text-emerald-400">
                            {st.totalPaidMonths} / {feeMatrixData.activeMonths?.length || 0}
                          </td>
                        </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION: ITEMIZED STUDENT ROSTER (DEFAULT / ROSTER MODE)                  */}
          {/* ========================================================================= */}
          {viewMode === 'roster' && (
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-5 rounded-3xl shadow-xl space-y-4">
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Users size={18} className="text-blue-400" />
                    Enrolled Students Roster ({formatMonthYear(selectedMonth)})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Registration fee records & 1-click monthly class fee status updates
                  </p>
                </div>
              </div>

              {/* Student Table (Clean Sans-Serif Typography) */}
              <div className="overflow-x-auto custom-scrollbar border border-slate-800 rounded-2xl">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-slate-300 font-bold border-b border-slate-700 text-[11px]">
                      <th className="p-3">#</th>
                      <th className="p-3">Student Reg ID</th>
                      <th className="p-3">Student Name</th>
                      <th className="p-3">Class</th>
                      <th className="p-3 text-center">Registration Fee</th>
                      <th className="p-3 text-center">Class Fee ({formatMonthYear(selectedMonth)})</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200">
                    {reportData.classes?.flatMap(cls => 
                      cls.students.map(st => ({ ...st, classId: cls.classId, className: cls.className, grade: cls.grade }))
                    )
                    .filter(st => {
                      if (statusFilter !== 'ALL' && st.feeStatus !== statusFilter) return false;
                      if (studentSearch) {
                        const q = studentSearch.toLowerCase();
                        return (
                          st.studentId.toLowerCase().includes(q) ||
                          st.studentName.toLowerCase().includes(q) ||
                          (st.phone && st.phone.includes(q))
                        );
                      }
                      return true;
                    })
                    .map((st, idx) => (
                      <tr key={`roster_${st.classId}_${st.id}_${idx}`} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 text-slate-500 font-medium">{idx + 1}</td>
                        <td className="p-3 font-semibold text-sky-400 tracking-tight">{st.studentId}</td>
                        <td className="p-3">
                          <span className="text-white font-semibold block">{st.studentName}</span>
                          {st.phone && <span className="text-[10px] text-slate-400">{st.phone}</span>}
                        </td>
                        <td className="p-3 text-slate-300">
                          {st.className} <span className="text-[10px] text-slate-500">({st.grade})</span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${st.registrationFeeStatus === 'PAID' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                            {st.registrationFeeStatus}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${st.feeStatus === 'PAID' ? 'bg-emerald-600 text-white' : (st.feeStatus === 'FREE_CARD' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700')}`}>
                            {st.feeStatus}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleToggleFeeStatus(st.id, st.classId, selectedMonth, st.feeStatus)}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${st.feeStatus === 'PAID' ? 'bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-300 border border-slate-700' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'}`}
                          >
                            {st.feeStatus === 'PAID' ? 'Mark Pending' : 'Mark Paid'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* Month-End Executive Invoice Modal */}
          <LecturerInvoiceModal
            isOpen={isInvoiceOpen}
            onClose={() => setIsInvoiceOpen(false)}
            reportData={reportData}
            selectedMonth={selectedMonth}
            selectedClassId={selectedClassId}
            classesList={classes}
          />

        </div>
      )}

    </div>
  );
}
