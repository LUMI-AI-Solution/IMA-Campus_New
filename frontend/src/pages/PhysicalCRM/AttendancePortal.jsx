import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from '../../api/axios';
import physicalCrmService from '../../api/physicalCrm';
import { 
  User, CheckCircle, XCircle, Search, ToggleLeft, ToggleRight, 
  CalendarDays, BookOpen, Save, ChevronLeft, ChevronRight, 
  History, X, Clock, DollarSign, CreditCard, Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, subMonths, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';

export default function AttendancePortal() {
    const [searchParams] = useSearchParams();
    const [scanInput, setScanInput] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    
    const [autoMark, setAutoMark] = useState(false);
    const [studentData, setStudentData] = useState(null);
    const [attendances, setAttendances] = useState([]);
    const [feePayments, setFeePayments] = useState([]);
    const [availableClasses, setAvailableClasses] = useState([]);
    const [selectedClassId, setSelectedClassId] = useState('');
    const [loading, setLoading] = useState(false);

    // Active Month Navigation State
    const [viewMonth, setViewMonth] = useState(new Date());
    
    // History Modal State
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

    // Scanner logic
    const scanBuffer = useRef('');
    const scanTimeout = useRef(null);
    const autoMarkRef = useRef(autoMark);

    useEffect(() => {
        autoMarkRef.current = autoMark;
    }, [autoMark]);

    // Check for query parameter on mount to auto-load student
    useEffect(() => {
        const studentIdParam = searchParams.get('studentId') || searchParams.get('search');
        if (studentIdParam) {
            handleScan(studentIdParam);
        }
    }, [searchParams]);

    // Live search debouncer for Scanner / Search input
    useEffect(() => {
        if (!scanInput || scanInput.trim().length < 2) {
            setSearchResults([]);
            setShowSuggestions(false);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                setIsSearching(true);
                const res = await axios.get(`/physical-crm/students-search?query=${encodeURIComponent(scanInput.trim())}`);
                if (res.data && res.data.students) {
                    setSearchResults(res.data.students);
                    setShowSuggestions(true);
                }
            } catch (err) {
                console.error('Error searching students:', err);
            } finally {
                setIsSearching(false);
            }
        }, 200);

        return () => clearTimeout(timer);
    }, [scanInput]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' && e.target.id !== 'hidden-scanner') return;

            if (e.key === 'Enter') {
                const scannedId = scanBuffer.current.trim();
                if (scannedId) {
                    handleScan(scannedId);
                }
                scanBuffer.current = '';
                return;
            }
            
            if (e.key.length === 1) {
                scanBuffer.current += e.key;
                clearTimeout(scanTimeout.current);
                scanTimeout.current = setTimeout(() => {
                    scanBuffer.current = '';
                }, 100);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleScan = async (studentIdentifier) => {
        setShowSuggestions(false);
        setLoading(true);
        try {
            const res = await axios.get(`/physical-crm/student-scan/${encodeURIComponent(studentIdentifier)}`);
            setStudentData(res.data.student);
            setAttendances(res.data.attendances || []);
            setFeePayments(res.data.feePayments || res.data.student?.feePayments || []);
            setAvailableClasses(res.data.availableClasses || []);
            
            if (autoMarkRef.current) {
                await markAttendance(res.data.student.id);
            } else {
                toast.success(`Loaded profile for ${res.data.student.studentName || res.data.student.firstName}`);
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'Student not found');
            setStudentData(null);
            setAttendances([]);
            setFeePayments([]);
        } finally {
            setLoading(false);
        }
    };

    const markAttendance = async (studentInternalId, dateString = format(new Date(), 'yyyy-MM-dd')) => {
        try {
            const res = await axios.post('/physical-crm/attendance', {
                studentId: studentInternalId,
                date: dateString
            });
            toast.success('Attendance marked successfully!');
            
            setAttendances(prev => {
                const newAtt = res.data.attendance;
                const existing = prev.findIndex(a => a.id === newAtt.id);
                if (existing >= 0) {
                    const copy = [...prev];
                    copy[existing] = newAtt;
                    return copy;
                }
                return [...prev, newAtt];
            });
        } catch (error) {
            toast.error('Failed to mark attendance');
        }
    };

    const unmarkAttendance = async (studentInternalId, dateString) => {
        try {
            await axios.post('/physical-crm/attendance/unmark', {
                studentId: studentInternalId,
                date: dateString
            });
            toast.success('Attendance unmarked!');
            setAttendances(prev => prev.filter(a => !(a.studentId === studentInternalId && isSameDay(new Date(a.date), new Date(dateString)))));
        } catch (error) {
            toast.error('Failed to unmark attendance');
        }
    };

    const allocateClass = async () => {
        if (!selectedClassId || !studentData) return;
        try {
            const res = await axios.put(`/physical-crm/students/${studentData.id}/allocate-class`, {
                classId: selectedClassId
            });
            setStudentData(res.data.student);
            toast.success('Class allocated successfully!');
        } catch (error) {
            toast.error('Failed to allocate class');
        }
    };

    // Toggle / Mark Class Fee Payment
    const handleClassFeePayment = async (classId, monthStr, currentStatus) => {
        if (!studentData) return;
        const newStatus = (currentStatus === 'PAID' || currentStatus === 'FREE_CARD') ? 'PENDING' : 'PAID';
        try {
            const res = await physicalCrmService.toggleFeePayment({
                studentId: studentData.id,
                classId,
                month: monthStr,
                status: newStatus,
                paymentMethod: 'CASH'
            });

            toast.success(`Class Fee marked as ${newStatus} & logged in Cash Flow!`);
            
            // Reload student
            handleScan(studentData.studentId || studentData.id);
        } catch (err) {
            toast.error('Failed to record class fee payment');
        }
    };

    // Mark Registration Fee Payment
    const handleRegistrationFeePayment = async () => {
        if (!studentData) return;
        try {
            const updated = await physicalCrmService.updateStudent(studentData.id, {
                ...studentData,
                registrationFeeStatus: 'PAID'
            });
            setStudentData(updated);
            toast.success('Registration Fee marked as PAID & logged in Cash Flow!');
        } catch (err) {
            toast.error('Failed to update registration fee');
        }
    };

    // Render Single Month Calendar Component
    const renderCalendarMonth = (baseDate, compact = false) => {
        const start = startOfMonth(baseDate);
        const end = endOfMonth(baseDate);
        const days = eachDayOfInterval({ start, end });

        const startDay = start.getDay(); 
        const paddingDays = Array(startDay).fill(null);

        return (
            <div className="bg-white/5 p-5 rounded-2xl border border-white/10 w-full shadow-inner flex flex-col justify-between">
                <div className="flex justify-between items-center mb-4">
                    <button
                        onClick={() => setViewMonth(prev => subMonths(prev, 1))}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all border border-white/10 cursor-pointer"
                        title="Previous Month"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <h3 className="font-extrabold text-white text-xl tracking-wide">{format(baseDate, 'MMMM yyyy')}</h3>
                    <button
                        onClick={() => setViewMonth(prev => addMonths(prev, 1))}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all border border-white/10 cursor-pointer"
                        title="Next Month"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>

                <div className="grid grid-cols-7 gap-1.5 mb-2 text-center text-xs font-bold text-white/50 uppercase tracking-wider">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d}>{d}</div>)}
                </div>

                <div className="grid grid-cols-7 gap-2 text-center flex-1">
                    {paddingDays.map((_, i) => <div key={`pad-${i}`} className="h-10"></div>)}
                    {days.map(day => {
                        const isAttended = attendances.some(a => isSameDay(new Date(a.date), day) && a.status === 'PRESENT');
                        const isCurrentDay = isToday(day);
                        return (
                            <button 
                                key={day.toISOString()} 
                                onClick={() => {
                                    if (studentData && !autoMark) {
                                        if (isAttended) {
                                            unmarkAttendance(studentData.id, format(day, 'yyyy-MM-dd'));
                                        } else {
                                            markAttendance(studentData.id, format(day, 'yyyy-MM-dd'));
                                        }
                                    }
                                }}
                                disabled={!studentData || autoMark}
                                className={`
                                    h-11 sm:h-12 w-full rounded-xl text-sm sm:text-base font-bold flex items-center justify-center transition-all
                                    ${isAttended ? 'bg-gradient-to-tr from-green-500 to-emerald-400 text-white font-extrabold shadow-[0_0_20px_rgba(16,185,129,0.5)] border border-green-300 scale-105 z-10' : 
                                      isCurrentDay ? 'bg-blue-500/30 text-blue-200 border-2 border-blue-400 font-extrabold' : 'bg-white/5 text-white/80 hover:bg-white/15'}
                                    ${(!studentData || autoMark) ? 'cursor-default' : 'cursor-pointer hover:scale-105'}
                                `}
                            >
                                {format(day, 'd')}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    // Extract distinct enrolled classes list for student
    const studentEnrolledClasses = React.useMemo(() => {
        if (!studentData) return [];
        const map = new Map();
        if (studentData.class) {
            map.set(studentData.class.id, studentData.class);
        }
        if (studentData.enrollments) {
            studentData.enrollments.forEach(e => {
                if (e.class) map.set(e.class.id, e.class);
            });
        }
        return Array.from(map.values());
    }, [studentData]);

    const activeMonthStr = format(viewMonth, 'yyyy-MM');

    return (
        <div className="p-4 md:p-6 h-full flex flex-col xl:flex-row gap-6 text-white relative max-w-[1700px] mx-auto animate-in fade-in duration-300">
            <input 
                id="hidden-scanner"
                type="text" 
                className="opacity-0 absolute -z-10" 
                value={scanInput} 
                onChange={(e) => setScanInput(e.target.value)}
            />

            {/* Left Panel: Scanner & Student Profile */}
            <div className="w-full xl:w-[460px] flex flex-col gap-6">
                
                {/* Scanner Card with Live Student Autocomplete */}
                <div className="bg-black/40 backdrop-blur-xl border border-white/20 p-6 rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.3)] relative z-30">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2 drop-shadow-md">
                                <Search className="text-blue-400" /> Student Search & Scan
                            </h2>
                            <p className="text-white/60 text-xs sm:text-sm mt-1">Search student name, ID or scan barcode</p>
                        </div>
                        <button 
                            onClick={() => setAutoMark(!autoMark)}
                            className="flex flex-col items-center gap-1 cursor-pointer group"
                        >
                            {autoMark ? <ToggleRight size={40} className="text-emerald-500 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)] group-hover:scale-105 transition-all" /> : <ToggleLeft size={40} className="text-white/40 group-hover:scale-105 transition-all" />}
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${autoMark ? 'text-emerald-400' : 'text-white/40'}`}>
                                Auto-Mark
                            </span>
                        </button>
                    </div>

                    <div className="relative group">
                        <input 
                            type="text" 
                            placeholder="Search Name, ID, or Phone..." 
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-20 py-3.5 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/30 transition-all shadow-inner text-sm"
                            value={scanInput}
                            onChange={e => {
                                setScanInput(e.target.value);
                                setShowSuggestions(true);
                            }}
                            onFocus={() => setShowSuggestions(true)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && scanInput) {
                                    handleScan(scanInput);
                                    setScanInput('');
                                }
                            }}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold tracking-wider bg-white/10 px-2 py-1 rounded text-white/50 group-hover:text-white/80 transition-colors pointer-events-none">
                            ENTER
                        </div>

                        {/* Autocomplete Dropdown List */}
                        {showSuggestions && searchResults.length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900/95 border border-white/20 rounded-2xl shadow-2xl overflow-hidden z-50 backdrop-blur-2xl divide-y divide-white/10 max-h-72 overflow-y-auto custom-scrollbar">
                                {searchResults.map(s => (
                                    <div
                                        key={s.id}
                                        onClick={() => {
                                            handleScan(s.studentId || s.phone || s.studentName);
                                            setScanInput('');
                                            setShowSuggestions(false);
                                        }}
                                        className="p-3.5 hover:bg-blue-600/30 cursor-pointer transition-all flex items-center justify-between gap-3 group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-md">
                                                {(s.studentName || s.firstName || 'S')[0]}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white text-sm group-hover:text-blue-300 transition-colors">
                                                    {s.studentName || `${s.firstName || ''} ${s.lastName || ''}`}
                                                </h4>
                                                <p className="text-xs text-white/60">
                                                    {s.studentId} {s.phone ? `• 📞 ${s.phone}` : ''}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-bold px-2 py-1 bg-white/10 rounded-lg text-white/70">
                                            {s.class?.name || 'No Class'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Student Details Card */}
                <div className="bg-black/40 backdrop-blur-xl border border-white/20 p-6 rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.3)] flex-1 flex flex-col relative overflow-hidden min-h-[460px] max-h-[780px]">
                    {loading && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-20 flex items-center justify-center">
                            <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                        </div>
                    )}
                    
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-4 drop-shadow-md shrink-0">
                        <User className="text-purple-400" /> Student Profile & Fees
                    </h2>

                    {studentData ? (
                        <div className="space-y-4 overflow-y-auto pr-1.5 custom-scrollbar flex-1 animate-fade-in">
                            <div className="flex items-center gap-4 bg-gradient-to-r from-white/10 to-transparent p-4 rounded-2xl border border-white/10 shadow-sm">
                                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-xl font-bold shadow-lg border-2 border-white/20 shrink-0">
                                    {(studentData.studentName || studentData.firstName || 'S')[0]}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-lg font-bold drop-shadow-sm truncate">{studentData.studentName || `${studentData.firstName} ${studentData.lastName}`}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <p className="text-red-400 font-bold text-xs">{studentData.studentId}</p>
                                        {studentData.cardType && studentData.cardType !== 'FULL' && (
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                                                studentData.cardType === 'FREE' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' :
                                                'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                            }`}>
                                                {studentData.cardType === 'FREE' ? '🟣 Free Card' : '🟡 Half Card'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white/5 p-3 rounded-xl border border-white/5 shadow-inner">
                                    <p className="text-xs text-white/50 uppercase tracking-wider mb-1 font-semibold">Phone</p>
                                    <p className="font-semibold text-xs text-white truncate">{studentData.phone || 'N/A'}</p>
                                </div>
                                <div className="bg-white/5 p-3 rounded-xl border border-white/5 shadow-inner">
                                    <p className="text-xs text-white/50 uppercase tracking-wider mb-1 font-semibold">Guardian</p>
                                    <p className="font-semibold text-xs text-white truncate">{studentData.guardianPhone || studentData.guardianName || 'N/A'}</p>
                                </div>
                            </div>

                            {/* Registration Fee Box */}
                            <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 shadow-inner flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-white/50 uppercase tracking-wider mb-1 font-semibold">Registration Fee</p>
                                    <div className="flex items-center gap-2">
                                        {studentData.registrationFeeStatus === 'PAID' ? (
                                            <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-md text-xs border border-emerald-500/20">PAID ✓</span>
                                        ) : (
                                            <span className="text-amber-400 font-bold bg-amber-500/10 px-2.5 py-0.5 rounded-md text-xs border border-amber-500/20">PENDING ⏳</span>
                                        )}
                                        {studentData.registrationFeeAmount > 0 && (
                                            <span className="text-xs text-white/60 font-semibold">Rs. {Number(studentData.registrationFeeAmount).toLocaleString()}</span>
                                        )}
                                    </div>
                                </div>
                                {studentData.registrationFeeStatus !== 'PAID' && (
                                    <button
                                        onClick={handleRegistrationFeePayment}
                                        className="bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg hover:shadow-emerald-500/30 transition-all cursor-pointer"
                                    >
                                        Mark Paid
                                    </button>
                                )}
                            </div>

                            {/* Monthly Class Fees Box (for Active Month) */}
                            <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 shadow-inner space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                                        <CreditCard size={14} className="text-red-400" />
                                        <span>Monthly Class Fees ({format(viewMonth, 'MMMM yyyy')})</span>
                                    </div>
                                </div>

                                {studentEnrolledClasses.length === 0 ? (
                                    <p className="text-xs text-amber-400/80 italic py-1">No classes allocated yet.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {studentEnrolledClasses.map(cls => {
                                            const pRecord = feePayments.find(p => p.classId === cls.id && p.month === activeMonthStr);
                                            const isPaid = pRecord && (pRecord.status === 'PAID' || pRecord.status === 'FREE_CARD' || pRecord.status === 'HALF_PAYMENT');
                                            
                                            // Check enrollment cardType or student default
                                            const enr = studentData.enrollments?.find(e => e.classId === cls.id);
                                            const cType = enr?.cardType || studentData.cardType || 'FULL';
                                            const expectedFee = cType === 'FREE' ? 0 : (cType === 'HALF' ? (cls.monthlyFee || 0) / 2 : (cls.monthlyFee || 0));

                                            return (
                                                <div 
                                                    key={cls.id} 
                                                    className="bg-white/5 p-2.5 rounded-xl border border-white/5 flex items-center justify-between gap-2"
                                                >
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-xs font-bold text-white truncate">{cls.name}</p>
                                                            {cType !== 'FULL' && (
                                                                <span className="text-[9px] font-extrabold text-amber-300 bg-amber-500/20 px-1.5 py-0.2 rounded border border-amber-500/30">
                                                                    {cType} CARD
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[11px] text-emerald-400 font-semibold">
                                                            Fee: Rs. {expectedFee} {cType === 'HALF' ? '(50% Off)' : cType === 'FREE' ? '(Free)' : ''}
                                                        </p>
                                                    </div>

                                                    <button
                                                        onClick={() => handleClassFeePayment(cls.id, activeMonthStr, isPaid ? 'PAID' : 'PENDING')}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm ${
                                                            isPaid 
                                                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                                                                : 'bg-red-600 hover:bg-red-500 text-white shadow-md'
                                                        }`}
                                                    >
                                                        {isPaid ? (
                                                            <>
                                                                <Check size={12} />
                                                                <span>{pRecord?.status === 'FREE_CARD' ? 'FREE ✓' : pRecord?.status === 'HALF_PAYMENT' ? 'HALF PAID ✓' : 'PAID ✓'}</span>
                                                            </>
                                                        ) : (
                                                            <span>Mark Paid</span>
                                                        )}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Allocated Classes List & Class Allocator */}
                            <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 shadow-inner space-y-2">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-white/50 uppercase tracking-wider font-semibold">Allocated Classes</p>
                                    <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-white/70 font-bold">
                                        {studentEnrolledClasses.length} Classes
                                    </span>
                                </div>
                                
                                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                                    {studentEnrolledClasses.length > 0 ? (
                                        studentEnrolledClasses.map(cls => (
                                            <div key={cls.id} className="flex items-center gap-1.5 text-emerald-300 font-semibold bg-emerald-500/15 px-2.5 py-1 rounded-lg border border-emerald-500/25 text-xs">
                                                <BookOpen size={13} className="text-emerald-400" />
                                                <span>{cls.name}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-xs text-amber-400 font-semibold py-1">No classes assigned yet</p>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                                    <select 
                                        value={selectedClassId}
                                        onChange={(e) => setSelectedClassId(e.target.value)}
                                        className="flex-1 min-w-0 bg-slate-800 border border-white/20 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-500 text-xs cursor-pointer truncate"
                                    >
                                        <option value="">+ Add another class...</option>
                                        {availableClasses.map(c => {
                                            const teacherNames = c.teachers && c.teachers.length > 0
                                                ? ` • ${c.teachers.map(t => t.name).join(', ')}`
                                                : '';
                                            return (
                                                <option key={c.id} value={c.id}>{c.name} ({c.grade}){teacherNames}</option>
                                            );
                                        })}
                                    </select>
                                    <button 
                                        type="button"
                                        onClick={allocateClass}
                                        className="bg-blue-600 hover:bg-blue-500 px-3.5 py-2 rounded-xl transition-colors text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer shadow-md text-white active:scale-95"
                                    >
                                        <Save size={14} />
                                        <span>Add</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 py-10">
                            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/10">
                                <User size={40} />
                            </div>
                            <p className="text-sm font-medium">Type student name/ID or scan card<br/>to load profile</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Panel: Clean Active Month Calendar Widget */}
            <div className="w-full xl:flex-1 bg-black/40 backdrop-blur-xl border border-white/20 p-6 xl:p-8 rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.3)] flex flex-col justify-between">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2 drop-shadow-md">
                            <CalendarDays className="text-emerald-400" /> Active Month Attendance Tracker
                        </h2>
                        <p className="text-white/60 text-sm mt-1">
                            {autoMark ? 'Auto-mark is active. Scan or click date to adjust.' : 'Click any date on calendar to mark attendance.'}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsHistoryModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg transition-all cursor-pointer"
                        >
                            <History size={16} /> View Full History 📅
                        </button>

                        {studentData && (
                            <div className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 px-3.5 py-2 rounded-full text-xs font-bold flex items-center gap-2">
                                <CheckCircle size={16} /> Ready
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Active Calendar Widget */}
                <div className="flex-1 flex flex-col justify-center">
                    {renderCalendarMonth(viewMonth)}
                </div>
            </div>

            {/* FULL ATTENDANCE HISTORY MODAL */}
            {isHistoryModalOpen && (
                <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
                    <div className="bg-slate-900 border border-white/20 rounded-3xl p-6 sm:p-8 max-w-2xl w-full text-white shadow-2xl relative space-y-6 max-h-[90vh] flex flex-col">
                        <button
                            onClick={() => setIsHistoryModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white p-2 cursor-pointer"
                        >
                            <X size={20} />
                        </button>

                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-purple-500/20 rounded-2xl border border-purple-500/30 text-purple-400">
                                <History size={26} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Full Attendance History Log 📅</h3>
                                <p className="text-xs text-gray-400">
                                    {studentData ? `Complete attendance records for ${studentData.studentName || studentData.firstName}` : 'Select a student to view complete attendance history'}
                                </p>
                            </div>
                        </div>

                        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between">
                            <div>
                                <p className="text-xs text-white/50 uppercase font-bold tracking-wider">Total Days Present</p>
                                <p className="text-2xl font-bold text-emerald-400 mt-0.5">{attendances.filter(a => a.status === 'PRESENT').length} Days</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-white/50 uppercase font-bold tracking-wider">Student ID</p>
                                <p className="text-sm font-bold text-white">{studentData?.studentId || 'N/A'}</p>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2.5">
                            {attendances.length === 0 ? (
                                <div className="text-center py-12 text-gray-400">
                                    <Clock size={40} className="mx-auto mb-2 opacity-40" />
                                    <p>No attendance records logged yet.</p>
                                </div>
                            ) : (
                                attendances.map(att => (
                                    <div key={att.id} className="bg-white/5 border border-white/10 p-3.5 rounded-xl flex items-center justify-between hover:bg-white/10 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
                                                <CheckCircle size={16} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-white">{format(new Date(att.date), 'EEEE, MMMM dd, yyyy')}</p>
                                                <p className="text-xs text-white/50">Recorded automatically in physical portal</p>
                                            </div>
                                        </div>
                                        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-bold uppercase tracking-wider">
                                            PRESENT
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
