import React, { useState, useEffect, useRef } from 'react';
import axios from '../../api/axios';
import { User, CheckCircle, XCircle, Search, ToggleLeft, ToggleRight, CalendarDays, BookOpen, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { format, subMonths, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';

export default function AttendancePortal() {
    const [scanInput, setScanInput] = useState('');
    const [autoMark, setAutoMark] = useState(false);
    const [studentData, setStudentData] = useState(null);
    const [attendances, setAttendances] = useState([]);
    const [availableClasses, setAvailableClasses] = useState([]);
    const [selectedClassId, setSelectedClassId] = useState('');
    const [loading, setLoading] = useState(false);

    // Scanner logic
    const scanBuffer = useRef('');
    const scanTimeout = useRef(null);
    // Keep a ref of autoMark so the event listener always uses the latest value
    const autoMarkRef = useRef(autoMark);

    useEffect(() => {
        autoMarkRef.current = autoMark;
    }, [autoMark]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ignore if user is typing in an input manually
            if (e.target.tagName === 'INPUT' && e.target.id !== 'hidden-scanner') return;

            if (e.key === 'Enter') {
                const scannedId = scanBuffer.current.trim();
                if (scannedId) {
                    handleScan(scannedId);
                }
                scanBuffer.current = '';
                return;
            }
            
            // Collect characters
            if (e.key.length === 1) {
                scanBuffer.current += e.key;
                
                // Clear buffer if it's too slow (likely typing, not scanning)
                clearTimeout(scanTimeout.current);
                scanTimeout.current = setTimeout(() => {
                    scanBuffer.current = '';
                }, 100);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []); // Only bind once

    const handleScan = async (studentId) => {
        setLoading(true);
        try {
            const res = await axios.get(`/physical-crm/student-scan/${studentId}`);
            setStudentData(res.data.student);
            setAttendances(res.data.attendances);
            setAvailableClasses(res.data.availableClasses);
            
            if (autoMarkRef.current) {
                await markAttendance(res.data.student.id);
            } else {
                toast.success('Student data loaded');
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
            
            // Refresh attendances
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

    // Calendar generation for 3 months (Prev, Current, Next)
    const renderMonth = (baseDate) => {
        const start = startOfMonth(baseDate);
        const end = endOfMonth(baseDate);
        const days = eachDayOfInterval({ start, end });

        // Padding for the first row
        const startDay = start.getDay(); 
        const paddingDays = Array(startDay).fill(null);

        return (
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 w-full shadow-inner">
                <h3 className="text-center font-bold text-white mb-4 text-lg">{format(baseDate, 'MMMM yyyy')}</h3>
                <div className="grid grid-cols-7 gap-1 mb-2 text-center text-[10px] sm:text-xs font-semibold text-white/50 uppercase tracking-wider">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d}>{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1 text-center">
                    {paddingDays.map((_, i) => <div key={`pad-${i}`} className="h-8"></div>)}
                    {days.map(day => {
                        const isAttended = attendances.some(a => isSameDay(new Date(a.date), day) && a.status === 'PRESENT');
                        const isCurrentDay = isToday(day);
                        return (
                            <button 
                                key={day.toISOString()} 
                                onClick={() => {
                                    if(studentData && !autoMark) {
                                        if (isAttended) {
                                            unmarkAttendance(studentData.id, format(day, 'yyyy-MM-dd'));
                                        } else {
                                            markAttendance(studentData.id, format(day, 'yyyy-MM-dd'));
                                        }
                                    }
                                }}
                                disabled={!studentData || autoMark}
                                className={`
                                    h-10 sm:h-12 w-full rounded-xl text-xs sm:text-base font-semibold flex items-center justify-center transition-all
                                    ${isAttended ? 'bg-gradient-to-tr from-green-500 to-emerald-400 text-white font-bold shadow-[0_0_15px_rgba(16,185,129,0.4)] border border-green-400/50 scale-105 z-10' : 
                                      isCurrentDay ? 'bg-blue-500/30 text-blue-200 border border-blue-500' : 'text-white/70 hover:bg-white/10'}
                                    ${(!studentData || autoMark) ? 'cursor-default' : 'cursor-pointer hover:bg-white/20 hover:scale-105'}
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

    const currentMonth = new Date();
    const prevMonth = subMonths(currentMonth, 1);
    const nextMonth = addMonths(currentMonth, 1);

    return (
        <div className="p-4 md:p-6 h-full flex flex-col xl:flex-row gap-6 animate-fade-in text-white relative">
            <input 
                id="hidden-scanner"
                type="text" 
                className="opacity-0 absolute -z-10" 
                value={scanInput} 
                onChange={(e) => setScanInput(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && scanInput) {
                        handleScan(scanInput);
                        setScanInput('');
                    }
                }}
            />

            {/* Left Panel: Scanner & Student Details */}
            <div className="w-full xl:w-[400px] flex flex-col gap-6">
                
                {/* Scanner Card */}
                <div className="bg-black/40 backdrop-blur-xl border border-white/20 p-6 rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2 drop-shadow-md">
                                <Search className="text-blue-400" /> Scanner
                            </h2>
                            <p className="text-white/60 text-xs sm:text-sm mt-1">Scan student ID card directly</p>
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
                            placeholder="Manual ID Entry..." 
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/30 transition-all shadow-inner"
                            value={scanInput}
                            onChange={e => setScanInput(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && scanInput) {
                                    handleScan(scanInput);
                                    setScanInput('');
                                }
                            }}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold tracking-wider bg-white/10 px-2 py-1 rounded text-white/50 group-hover:text-white/80 transition-colors">
                            ENTER
                        </div>
                    </div>
                </div>

                {/* Student Details Card */}
                <div className="bg-black/40 backdrop-blur-xl border border-white/20 p-6 rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.3)] flex-1 flex flex-col relative overflow-hidden min-h-[300px]">
                    {loading && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-10 flex items-center justify-center">
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
                                    {studentData.firstName?.[0]}{studentData.lastName?.[0]}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold drop-shadow-sm">{studentData.firstName} {studentData.lastName}</h3>
                                    <p className="text-white/50 font-mono text-sm">{studentData.studentId}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 p-3 rounded-xl border border-white/5 shadow-inner">
                                    <p className="text-[10px] text-white/50 uppercase tracking-wider mb-1 font-bold">Phone</p>
                                    <p className="font-semibold text-sm">{studentData.phone || 'N/A'}</p>
                                </div>
                                <div className="bg-white/5 p-3 rounded-xl border border-white/5 shadow-inner">
                                    <p className="text-[10px] text-white/50 uppercase tracking-wider mb-1 font-bold">Grade</p>
                                    <p className="font-semibold text-sm">{studentData.grade || 'N/A'}</p>
                                </div>
                            </div>

                            <div className="bg-white/5 p-4 rounded-xl border border-white/5 shadow-inner flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] text-white/50 uppercase tracking-wider mb-1 font-bold">Registration Fee</p>
                                    <div className="flex items-center gap-2">
                                        {studentData.registrationFeeStatus === 'PAID' ? (
                                            <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded-md text-xs border border-emerald-500/20">PAID</span>
                                        ) : (
                                            <span className="text-amber-400 font-bold bg-amber-500/10 px-2 py-1 rounded-md text-xs border border-amber-500/20">PENDING</span>
                                        )}
                                        {studentData.registrationFeeAmount && (
                                            <span className="text-white/70 text-sm">LKR {studentData.registrationFeeAmount}</span>
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
                                        className="bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold px-3 py-2 rounded-lg shadow-lg hover:shadow-emerald-500/30 transition-all"
                                    >
                                        Mark Paid
                                    </button>
                                )}
                            </div>

                            <div className="bg-white/5 p-4 rounded-xl border border-white/5 shadow-inner">
                                <p className="text-[10px] text-white/50 uppercase tracking-wider mb-2 font-bold">Class Allocation</p>
                                {studentData.classId ? (
                                    <div className="flex items-center gap-2 text-emerald-400 font-bold bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 shadow-sm">
                                        <BookOpen size={18} />
                                        {studentData.class?.name || 'Assigned'}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <select 
                                            value={selectedClassId}
                                            onChange={(e) => setSelectedClassId(e.target.value)}
                                            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm shadow-inner"
                                        >
                                            <option value="" className="text-black">Select a class...</option>
                                            {availableClasses.map(c => (
                                                <option key={c.id} value={c.id} className="text-black">{c.name} - {c.grade}</option>
                                            ))}
                                        </select>
                                        <button 
                                            onClick={allocateClass}
                                            className="bg-blue-600 hover:bg-blue-500 p-2.5 rounded-xl transition-colors shadow-lg hover:shadow-blue-500/30"
                                        >
                                            <Save size={20} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 py-10">
                            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/10">
                                <User size={40} />
                            </div>
                            <p className="text-sm font-medium">Scan a card to load<br/>student information</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Panel: Calendar */}
            <div className="w-full xl:flex-1 bg-black/40 backdrop-blur-xl border border-white/20 p-6 xl:p-8 rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.3)] flex flex-col">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2 drop-shadow-md">
                            <CalendarDays className="text-emerald-400" /> Attendance Tracker
                        </h2>
                        {!autoMark ? (
                            <p className="text-white/60 text-sm mt-1">Click on a date to manually mark attendance</p>
                        ) : (
                            <p className="text-emerald-400/80 text-sm mt-1 font-medium">Auto-mark is ON. Scanning will automatically mark today.</p>
                        )}
                    </div>
                    {studentData && (
                        <div className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.2)] animate-pulse-slow">
                            <CheckCircle size={18} /> Ready
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 h-full">
                    {renderMonth(prevMonth)}
                    {renderMonth(currentMonth)}
                    {renderMonth(nextMonth)}
                </div>
            </div>
        </div>
    );
}
