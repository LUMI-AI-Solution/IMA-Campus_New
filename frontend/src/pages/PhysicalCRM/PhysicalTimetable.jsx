import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, Clock, Download, Printer, Filter, Search, User, 
  BookOpen, Sparkles, ChevronLeft, ChevronRight, Layers, Award,
  CheckCircle2, AlertCircle
} from 'lucide-react';
import { physicalCrmService } from '../../api/physicalCrm';
import toast from 'react-hot-toast';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Helper to convert time string (e.g., "08:00 AM", "8:30", "13:30", "2:00 PM") to total minutes from midnight for exact sorting
const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return 9999;
  const clean = timeStr.trim().toUpperCase();
  const isPM = clean.includes('PM');
  const isAM = clean.includes('AM');
  const match = clean.match(/(\d+):?(\d*)/);
  if (!match) return 9999;
  let hour = parseInt(match[1], 10);
  const min = match[2] ? parseInt(match[2], 10) : 0;
  if (isPM && hour < 12) hour += 12;
  if (isAM && hour === 12) hour = 0;
  return hour * 60 + min;
};

// Format time string to clean 12-hour AM/PM format
const format12Hour = (timeStr) => {
  if (!timeStr) return '';
  if (/am|pm/i.test(timeStr)) return timeStr.toUpperCase();
  const parts = timeStr.split(':');
  if (parts.length >= 2) {
    let hour = parseInt(parts[0], 10);
    const minute = parts[1].slice(0, 2);
    const period = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${hour.toString().padStart(2, '0')}:${minute} ${period}`;
  }
  return timeStr;
};

// Calculate duration in hours & minutes between two time strings
const calculateDuration = (startTime, endTime) => {
  const startMin = parseTimeToMinutes(startTime);
  const endMin = parseTimeToMinutes(endTime);
  if (endMin <= startMin || startMin >= 9999 || endMin >= 9999) return '';
  const diff = endMin - startMin;
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours} hr${hours > 1 ? 's' : ''}`;
  return `${minutes} min`;
};

export default function PhysicalTimetable() {
  const [schedule, setSchedule] = useState({});
  const [classesList, setClassesList] = useState([]);
  const [teachersList, setTeachersList] = useState([]);
  const [loading, setLoading] = useState(true);

  // View state: 'daywise' | 'weekly'
  const [viewMode, setViewMode] = useState('daywise');
  
  // Current active day for daywise view (defaults to today's day of week or Monday)
  const [activeDay, setActiveDay] = useState(() => {
    const todayIndex = new Date().getDay(); // 0 is Sunday, 1 is Monday...
    const dayMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return dayMap[todayIndex] || 'Monday';
  });

  // Filters
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState('ALL');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [classesRes, teachersRes] = await Promise.all([
        physicalCrmService.getClasses(),
        physicalCrmService.getTeachers()
      ]);

      const classes = classesRes || [];
      const teachers = teachersRes || [];
      setClassesList(classes);
      setTeachersList(teachers);

      // Build schedule map
      const dayMap = {};
      DAYS.forEach(d => dayMap[d] = []);

      // 1. Slots from Classes
      classes.forEach(cls => {
        if (cls.timetables && cls.timetables.length > 0) {
          const teacherNames = cls.teachers && cls.teachers.length > 0
            ? cls.teachers.map(t => t.name).join(', ')
            : 'No Teacher Assigned';

          cls.timetables.forEach(slot => {
            if (dayMap[slot.dayOfWeek]) {
              dayMap[slot.dayOfWeek].push({
                id: slot.id,
                classId: cls.id,
                startTime: slot.startTime,
                endTime: slot.endTime,
                formattedStartTime: format12Hour(slot.startTime),
                formattedEndTime: format12Hour(slot.endTime),
                duration: calculateDuration(slot.startTime, slot.endTime),
                teacherName: teacherNames,
                teachers: cls.teachers || [],
                className: cls.name,
                classGrade: cls.grade || '',
                classStream: cls.stream || '',
                classSubject: cls.subject || '',
                monthlyFee: cls.monthlyFee || 0,
                dayOfWeek: slot.dayOfWeek
              });
            }
          });
        }
      });

      // 2. Direct teacher slots (if any legacy slots)
      teachers.forEach(teacher => {
        if (teacher.timetables) {
          teacher.timetables.forEach(slot => {
            if (slot.dayOfWeek && dayMap[slot.dayOfWeek] && !slot.classId) {
              dayMap[slot.dayOfWeek].push({
                id: slot.id,
                classId: null,
                startTime: slot.startTime,
                endTime: slot.endTime,
                formattedStartTime: format12Hour(slot.startTime),
                formattedEndTime: format12Hour(slot.endTime),
                duration: calculateDuration(slot.startTime, slot.endTime),
                teacherName: teacher.name,
                teachers: [teacher],
                className: teacher.classes && teacher.classes.length > 0 ? teacher.classes.map(c => c.name).join(', ') : 'Direct Slot',
                classGrade: '',
                classStream: '',
                classSubject: '',
                monthlyFee: 0,
                dayOfWeek: slot.dayOfWeek
              });
            }
          });
        }
      });

      // Sort every day chronologically by start time in minutes!
      DAYS.forEach(d => {
        dayMap[d].sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));
      });

      setSchedule(dayMap);
    } catch (err) {
      toast.error('Failed to load schedule data');
    } finally {
      setLoading(false);
    }
  };

  // Unique Grades for filter dropdown
  const uniqueGrades = useMemo(() => {
    const grades = new Set();
    classesList.forEach(c => {
      if (c.grade) grades.add(c.grade);
    });
    return Array.from(grades).sort();
  }, [classesList]);

  // Filtered Schedule based on selected filters
  const filteredSchedule = useMemo(() => {
    const res = {};
    DAYS.forEach(day => {
      const slots = schedule[day] || [];
      res[day] = slots.filter(slot => {
        // Teacher filter
        const matchTeacher = selectedTeacherFilter === 'ALL' || 
          slot.teacherName.toLowerCase().includes(selectedTeacherFilter.toLowerCase());

        // Grade filter
        const matchGrade = selectedGradeFilter === 'ALL' || 
          slot.classGrade === selectedGradeFilter;

        // Search term
        const term = searchTerm.trim().toLowerCase();
        const matchSearch = !term ||
          slot.className.toLowerCase().includes(term) ||
          slot.teacherName.toLowerCase().includes(term) ||
          slot.classGrade.toLowerCase().includes(term) ||
          slot.classSubject.toLowerCase().includes(term) ||
          slot.classStream.toLowerCase().includes(term);

        return matchTeacher && matchGrade && matchSearch;
      });
    });
    return res;
  }, [schedule, selectedTeacherFilter, selectedGradeFilter, searchTerm]);

  // Total class slots count across all days
  const totalSlotsCount = useMemo(() => {
    return Object.values(filteredSchedule).reduce((acc, list) => acc + list.length, 0);
  }, [filteredSchedule]);

  // Export Timetable to CSV
  const handleExportCSV = () => {
    const headers = ['Day', 'Start Time', 'End Time', 'Duration', 'Class Name', 'Grade', 'Stream', 'Subject', 'Lecturer', 'Monthly Fee'];
    const rows = [];

    DAYS.forEach(day => {
      const slots = filteredSchedule[day] || [];
      slots.forEach(s => {
        rows.push([
          `"${day}"`,
          `"${s.formattedStartTime || s.startTime}"`,
          `"${s.formattedEndTime || s.endTime}"`,
          `"${s.duration || ''}"`,
          `"${(s.className || '').replace(/"/g, '""')}"`,
          `"${s.classGrade || ''}"`,
          `"${s.classStream || ''}"`,
          `"${s.classSubject || ''}"`,
          `"${(s.teacherName || '').replace(/"/g, '""')}"`,
          s.monthlyFee || 0
        ]);
      });
    });

    if (rows.length === 0) {
      toast.error('No schedule data to export');
      return;
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Physical_Campus_Timetable_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Timetable exported as CSV!');
  };

  // Print Softcopy
  const handlePrintSoftcopy = () => {
    window.print();
  };

  return (
    <div className="space-y-6 w-full min-h-full pb-16 max-w-[1700px] mx-auto animate-in fade-in duration-500">
      
      {/* 1. Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-pink-600 to-rose-600 p-2.5 rounded-2xl shadow-lg shadow-pink-600/30 text-white">
            <Calendar size={26} />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              Physical Class Timetable
            </h1>
            <p className="text-white/60 text-xs sm:text-sm mt-0.5">
              Chronologically ordered class schedule • Day-wise & Weekly interactive timetable views.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Mode Switcher */}
          <div className="flex bg-black/40 p-1 rounded-2xl border border-white/15">
            <button
              onClick={() => setViewMode('daywise')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'daywise'
                  ? 'bg-brand-accent text-white shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              📅 Day-by-Day View
            </button>
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'weekly'
                  ? 'bg-brand-accent text-white shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              🗓️ Weekly 7-Day Grid
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Download size={14} /> Export CSV
          </button>
          
          <button
            onClick={handlePrintSoftcopy}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-accent to-rose-600 hover:from-rose-600 hover:to-brand-accent text-white rounded-xl text-xs font-extrabold shadow-lg shadow-brand-accent/30 transition-all active:scale-95 cursor-pointer"
          >
            <Printer size={14} /> Print / Softcopy 🖨️
          </button>
        </div>
      </div>

      {/* 2. Filters & Search Bar */}
      <div className="bg-black/40 backdrop-blur-xl border border-white/15 rounded-3xl p-4 shadow-xl flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" size={14} />
          <input
            type="text"
            placeholder="Search class, lecturer, subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder:text-white/30 focus:border-brand-accent outline-none"
          />
        </div>

        {/* Teacher Filter */}
        <div className="w-full md:w-56">
          <select
            value={selectedTeacherFilter}
            onChange={(e) => setSelectedTeacherFilter(e.target.value)}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white outline-none cursor-pointer"
          >
            <option value="ALL" className="text-black">All Lecturers / Teachers</option>
            {teachersList.map(t => (
              <option key={t.id} value={t.name} className="text-black">{t.name}</option>
            ))}
          </select>
        </div>

        {/* Grade Filter */}
        <div className="w-full md:w-44">
          <select
            value={selectedGradeFilter}
            onChange={(e) => setSelectedGradeFilter(e.target.value)}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white outline-none cursor-pointer"
          >
            <option value="ALL" className="text-black">All Grades / Years</option>
            {uniqueGrades.map(g => (
              <option key={g} value={g} className="text-black">{g}</option>
            ))}
          </select>
        </div>

        {/* Total Sessions Count Pill */}
        <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl border border-white/10 shrink-0">
          <Clock size={14} className="text-brand-accent" />
          <span className="text-xs font-bold text-white">
            {totalSlotsCount} <span className="text-white/50 font-normal">Active Slots</span>
          </span>
        </div>

      </div>

      {/* 3. Main Content: Daywise Focus View or Weekly Grid View */}
      {loading ? (
        <div className="flex justify-center items-center py-36">
          <div className="w-10 h-10 border-4 border-brand-accent border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : viewMode === 'daywise' ? (
        
        /* ------------------------------------------------------------- */
        /* DAY-BY-DAY TIMELINE VIEW                                      */
        /* ------------------------------------------------------------- */
        <div className="space-y-4">
          
          {/* Day Navigation Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {DAYS.map(day => {
              const daySlots = filteredSchedule[day] || [];
              const isSelected = activeDay === day;
              return (
                <button
                  key={day}
                  onClick={() => setActiveDay(day)}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-b from-brand-accent to-rose-600 border-rose-400/50 shadow-lg shadow-rose-600/30 text-white transform -translate-y-0.5'
                      : 'bg-black/30 hover:bg-white/10 border-white/10 text-white/70 hover:text-white'
                  }`}
                >
                  <h4 className="text-xs font-extrabold uppercase tracking-wider">{day}</h4>
                  <span className={`text-[10px] font-bold mt-1 inline-block px-2 py-0.5 rounded-full ${
                    isSelected ? 'bg-black/30 text-white' : 'bg-white/5 text-white/50'
                  }`}>
                    {daySlots.length} {daySlots.length === 1 ? 'Class' : 'Classes'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Day Class Schedule List */}
          <div className="bg-black/40 backdrop-blur-xl border border-white/15 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-brand-accent" />
                <h3 className="text-base font-extrabold text-white">
                  {activeDay} Schedule ({filteredSchedule[activeDay]?.length || 0} Classes Scheduled)
                </h3>
              </div>
              <span className="text-xs text-white/50 font-medium">Sorted chronologically by start time</span>
            </div>

            {(!filteredSchedule[activeDay] || filteredSchedule[activeDay].length === 0) ? (
              <div className="text-center py-20 text-white/40 space-y-2">
                <Clock size={40} className="mx-auto opacity-30" />
                <h4 className="text-sm font-bold text-white/60 uppercase">No Classes Scheduled for {activeDay}</h4>
                <p className="text-xs">Try selecting another day or adjusting your filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSchedule[activeDay].map((slot, idx) => (
                  <div
                    key={slot.id || idx}
                    className="p-5 bg-gradient-to-b from-white/10 to-white/5 rounded-2xl border border-white/15 hover:border-brand-accent/50 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-accent/10 space-y-3 group"
                  >
                    {/* Time Header with Duration */}
                    <div className="flex items-center justify-between bg-black/40 p-2.5 rounded-xl border border-white/10">
                      <div className="flex items-center gap-2">
                        <Clock size={15} className="text-brand-accent" />
                        <span className="text-xs font-black text-white tracking-wide">
                          {slot.formattedStartTime || slot.startTime} - {slot.formattedEndTime || slot.endTime}
                        </span>
                      </div>
                      {slot.duration && (
                        <span className="text-[10px] font-extrabold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                          {slot.duration}
                        </span>
                      )}
                    </div>

                    {/* Class Details */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        {slot.classGrade && (
                          <span className="text-[9px] font-extrabold text-brand-accent bg-brand-accent/20 px-2 py-0.5 rounded-full border border-brand-accent/30 uppercase">
                            {slot.classGrade}
                          </span>
                        )}
                        {slot.classStream && (
                          <span className="text-[9px] font-bold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full border border-purple-500/30">
                            {slot.classStream}
                          </span>
                        )}
                        {slot.classSubject && (
                          <span className="text-[9px] font-bold text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded-full border border-blue-500/30">
                            {slot.classSubject}
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-extrabold text-white group-hover:text-brand-accent transition-colors">
                        {slot.className}
                      </h4>
                    </div>

                    {/* Teacher & Fee Footer */}
                    <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <div className="w-6 h-6 rounded-full bg-brand-accent/20 border border-brand-accent/40 flex items-center justify-center text-brand-accent shrink-0">
                          <User size={12} />
                        </div>
                        <span className="font-bold text-white/80 truncate">
                          {slot.teacherName}
                        </span>
                      </div>

                      {slot.monthlyFee > 0 && (
                        <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20 shrink-0">
                          Rs. {Number(slot.monthlyFee).toLocaleString()}
                        </span>
                      )}
                    </div>

                  </div>
                ))}
              </div>
            )}

          </div>

        </div>

      ) : (

        /* ------------------------------------------------------------- */
        /* WEEKLY 7-DAY GRID VIEW                                        */
        /* ------------------------------------------------------------- */
        <div className="bg-black/40 backdrop-blur-xl border border-white/15 rounded-3xl p-6 shadow-2xl">
          <div className="overflow-x-auto pb-4 custom-scrollbar">
            <div className="grid grid-cols-7 gap-3.5 min-w-[1300px] items-start">
              {DAYS.map(day => {
                const slots = filteredSchedule[day] || [];
                return (
                  <div key={day} className="flex flex-col bg-black/30 rounded-2xl border border-white/10 overflow-hidden min-h-[360px]">
                    {/* Column Day Header */}
                    <div className="bg-gradient-to-r from-brand-accent/30 to-purple-600/20 px-3 py-3 border-b border-white/10 text-center">
                      <h4 className="text-white font-extrabold tracking-wider uppercase text-xs">{day}</h4>
                      <span className="text-[10px] text-white/60 font-medium mt-0.5 block">{slots.length} Classes</span>
                    </div>

                    {/* Slots List */}
                    <div className="p-2.5 flex-1 flex flex-col gap-2.5">
                      {slots.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-white/30 py-12">
                          <Clock size={28} className="mb-2 opacity-20" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">No Classes</span>
                        </div>
                      ) : (
                        slots.map((slot, idx) => (
                          <div
                            key={slot.id || idx}
                            className="bg-white/5 hover:bg-white/10 p-3 rounded-xl border border-white/10 hover:border-brand-accent/40 transition-all hover:-translate-y-0.5 hover:shadow-lg space-y-2"
                          >
                            <div className="text-center bg-black/40 p-1.5 rounded-lg border border-white/10">
                              <span className="text-xs font-black text-brand-accent block">
                                {slot.formattedStartTime || slot.startTime}
                              </span>
                              <span className="text-[9px] text-white/40 uppercase font-bold block">to</span>
                              <span className="text-xs font-black text-brand-accent block">
                                {slot.formattedEndTime || slot.endTime}
                              </span>
                            </div>

                            <div className="text-center pt-1">
                              <h5 className="font-bold text-white text-xs leading-tight line-clamp-2">
                                {slot.className}
                              </h5>
                              {slot.classGrade && (
                                <span className="text-[9px] font-extrabold text-white/70 bg-white/10 px-1.5 py-0.2 rounded-md mt-1 inline-block">
                                  {slot.classGrade}
                                </span>
                              )}
                              <p className="text-[10px] text-white/60 font-medium truncate mt-1">
                                {slot.teacherName}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      )}

      {/* ========================================================================= */}
      {/* HIDDEN PRINT SOFTCOPY TEMPLATE FOR TIMETABLE                              */}
      {/* ========================================================================= */}
      <div className="hidden print:block text-black bg-white p-8 font-sans" id="printable-timetable">
        {/* Header */}
        <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
          <h1 className="text-2xl font-black uppercase tracking-wider">IMA PHYSICAL CAMPUS</h1>
          <h2 className="text-base font-bold text-gray-700 mt-0.5">Physical Campus Master Class Timetable</h2>
          <p className="text-xs text-gray-500 mt-1">
            Generated on: {new Date().toLocaleString()} | Filter: {selectedTeacherFilter !== 'ALL' ? `Teacher: ${selectedTeacherFilter} | ` : ''}{selectedGradeFilter !== 'ALL' ? `Grade: ${selectedGradeFilter}` : 'All Grades'}
          </p>
        </div>

        {/* Day-by-Day Table */}
        <div className="space-y-6">
          {DAYS.map(day => {
            const daySlots = filteredSchedule[day] || [];
            if (daySlots.length === 0) return null;
            return (
              <div key={day} className="mb-4">
                <h3 className="text-xs font-black uppercase bg-gray-800 text-white px-3 py-1.5 rounded-t">
                  {day} ({daySlots.length} Classes)
                </h3>
                <table className="w-full text-left text-[10px] border-collapse border border-gray-400">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="p-1.5 border border-gray-300 w-28">Time Slot</th>
                      <th className="p-1.5 border border-gray-300 w-16">Duration</th>
                      <th className="p-1.5 border border-gray-300">Class Name</th>
                      <th className="p-1.5 border border-gray-300 w-20">Grade / Year</th>
                      <th className="p-1.5 border border-gray-300 w-28">Subject</th>
                      <th className="p-1.5 border border-gray-300">Lecturer / Teacher</th>
                      <th className="p-1.5 border border-gray-300 w-20 text-right">Fee (LKR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {daySlots.map((s, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="p-1.5 border border-gray-300 font-mono font-bold">{s.formattedStartTime || s.startTime} - {s.formattedEndTime || s.endTime}</td>
                        <td className="p-1.5 border border-gray-300">{s.duration || '-'}</td>
                        <td className="p-1.5 border border-gray-300 font-bold">{s.className}</td>
                        <td className="p-1.5 border border-gray-300">{s.classGrade || '-'}</td>
                        <td className="p-1.5 border border-gray-300">{s.classSubject || s.classStream || '-'}</td>
                        <td className="p-1.5 border border-gray-300 font-semibold">{s.teacherName}</td>
                        <td className="p-1.5 border border-gray-300 text-right font-mono">{s.monthlyFee ? `Rs. ${s.monthlyFee}` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>

        {/* Print Footer */}
        <div className="mt-8 pt-4 border-t border-gray-400 flex justify-between text-[10px] text-gray-500">
          <span>IMA Campus Timetable Management System</span>
          <span>Physical Department</span>
        </div>
      </div>

    </div>
  );
}
