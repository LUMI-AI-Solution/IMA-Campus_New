import React, { useState, useEffect, useRef } from 'react';
import axios from '../../api/axios';
import physicalCrmService from '../../api/physicalCrm';
import { User, CheckCircle, XCircle, Search, ToggleLeft, ToggleRight, CalendarDays, BookOpen, Save, ChevronLeft, ChevronRight, History, X, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { format, subMonths, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';

export default function AttendancePortal() {
    const [scanInput, setScanInput] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    
    const [autoMark, setAutoMark] = useState(false);
    const [studentData, setStudentData] = useState(null);
    const [attendances, setAttendances] = useState([]);
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
            setAttendances(res.data.attendances);
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
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all border border-white/10"
                        title="Previous Month"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <h3 className="font-extrabold text-white text-xl tracking-wide">{format(baseDate, 'MMMM yyyy')}</h3>
                    <button
                        onClick={() => setViewMonth(prev => addMonths(prev, 1))}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all border border-white/10"
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
            <div className="w-full xl:w-[420px] flex flex-col gap-6">
                
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
                                                <p className="text-xs text-white/60 font-mono">
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
                <div className="bg-black/40 backdrop-blur-xl border border-white/20 p-6 rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.3)] flex-1 flex flex-col relative overflow-hidden min-h-[320px]">
                    {loading && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-20 flex items-center justify-center">
                            <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                        </div>
                    )}
                    
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-6 drop-shadow-md">
                        <User className="text-purple-400" /> Student Profile
                    </h2>

                    {studentData ? (
                        <div className="space-y-5 animate-fade-in">
                            <div className="flex items-center gap-4 bg-gradient-to-r from-white/10 to-transparent p-4 rounded-2xl border border-white/10 shadow-sm">
                                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-xl font-bold shadow-lg border-2 border-white/20">
                                    {(studentData.studentName || studentData.firstName || 'S')[0]}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold drop-shadow-sm">{studentData.studentName || `${studentData.firstName} ${studentData.lastName}`}</h3>
                                    <p className="text-white/50 font-mono text-sm">{studentData.studentId}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 p-3 rounded-xl border border-white/5 shadow-inner">
                                    <p className="text-[10px] text-white/50 uppercase tracking-wider mb-1 font-bold">Phone</p>
                                    <p className="font-semibold text-sm">{studentData.phone || 'N/A'}</p>
                                </div>
                                <div className="bg-white/5 p-3 rounded-xl border border-white/5 shadow-inner">
                                    <p className="text-[10px] text-white/50 uppercase tracking-wider mb-1 font-bold">Parent</p>
                                    <p className="font-semibold text-sm truncate">{studentData.guardianName || studentData.guardianPhone || 'N/A'}</p>
                                </div>
                            </div>

                            <div className="bg-white/5 p-4 rounded-xl border border-white/5 shadow-inner flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] text-white/50 uppercase tracking-wider mb-1 font-bold">Registration Fee</p>
                                    <div className="flex items-center gap-2">
                                        {studentData.registrationFeeStatus === 'PAID' ? (
                                            <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-md text-xs border border-emerald-500/20">PAID</span>
                                        ) : (
                                            <span className="text-amber-400 font-bold bg-amber-500/10 px-2.5 py-1 rounded-md text-xs border border-amber-500/20">PENDING</span>
                                        )}
                                    </div>
                                </div>
                                {studentData.registrationFeeStatus !== 'PAID' && (
                                    <button
                                        onClick={async () => {
                                            try {
                                                const updated = await physicalCrmService.updateStudent(studentData.id, {
                                                    ...studentData,
                                                    registrationFeeStatus: 'PAID'
                                                });
                                                setStudentData(updated);
                                                toast.success('Registration Fee marked as PAID!');
                                            } catch (err) {
                                                toast.error('Failed to update fee status');
                                            }
                                        }}
                                        className="bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold px-3.5 py-2 rounded-lg shadow-lg hover:shadow-emerald-500/30 transition-all"
                                    >
                                        Mark Paid
                                    </button>
                                )}
                            </div>

                            <div className="bg-white/5 p-4 rounded-xl border border-white/5 shadow-inner">
                                <p className="text-[10px] text-white/50 uppercase tracking-wider mb-2 font-bold">Allocated Classes (Multi-Class)</p>
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                    {studentData.enrollments && studentData.enrollments.length > 0 ? (
                                        studentData.enrollments.map(e => (
                                            <div key={e.id} className="flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 text-xs shadow-sm">
                                                <BookOpen size={14} />
                                                {e.class?.name || 'Class'}
                                            </div>
                                        ))
                                    ) : studentData.class ? (
                                        <div className="flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 text-xs shadow-sm">
                                            <BookOpen size={14} />
                                            {studentData.class.name}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-amber-400 font-semibold">No classes assigned yet</p>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    <select 
                                        value={selectedClassId}
                                        onChange={(e) => setSelectedClassId(e.target.value)}
                                        className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs shadow-inner"
                                    >
                                        <option value="" className="text-black">+ Add another class...</option>
                                        {availableClasses.map(c => (
                                            <option key={c.id} value={c.id} className="text-black">{c.name}</option>
                                        ))}
                                    </select>
                                    <button 
                                        onClick={allocateClass}
                                        className="bg-blue-600 hover:bg-blue-500 px-3 py-2 rounded-xl transition-colors shadow-lg hover:shadow-blue-500/30 text-xs font-bold flex items-center gap-1"
                                    >
                                        <Save size={16} /> Add
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
                        {/* History Modal Trigger Button */}
                        <button
                            onClick={() => setIsHistoryModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-purple-600/30 transition-all border border-purple-400/30"
                        >
                            <History size={16} /> View Full History 📅
                        </button>

                        {studentData && (
                            <div className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 px-3.5 py-2 rounded-full text-xs font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
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
                            className="absolute top-4 right-4 text-gray-400 hover:text-white p-2"
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

                        {/* Summary Pill */}
                        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between">
                            <div>
                                <p className="text-xs text-white/50 uppercase font-bold tracking-wider">Total Days Present</p>
                                <p className="text-2xl font-extrabold text-emerald-400 mt-0.5">{attendances.filter(a => a.status === 'PRESENT').length} Days</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-white/50 uppercase font-bold tracking-wider font-mono">Student ID</p>
                                <p className="text-sm font-bold text-white font-mono">{studentData?.studentId || 'N/A'}</p>
                            </div>
                        </div>

                        {/* Attendance Log List */}
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
                                                <p className="text-[11px] text-white/50">Recorded automatically in physical portal</p>
                                            </div>
                                        </div>
                                        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-extrabold uppercase tracking-wider">
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
