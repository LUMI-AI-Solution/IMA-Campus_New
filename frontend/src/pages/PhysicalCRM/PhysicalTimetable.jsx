import React, { useState, useEffect } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { physicalCrmService } from '../../api/physicalCrm';
import toast from 'react-hot-toast';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function PhysicalTimetable() {
  const [schedule, setSchedule] = useState({});
  const [loading, setLoading] = useState(true);

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

      // Build schedule map
      const dayMap = {};
      DAYS.forEach(d => dayMap[d] = []);

      // 1. From Classes timetables
      (classesRes || []).forEach(cls => {
        if (cls.timetables && cls.timetables.length > 0) {
          const teacherNames = cls.teachers && cls.teachers.length > 0
            ? cls.teachers.map(t => t.name).join(', ')
            : 'No Teacher Assigned';

          cls.timetables.forEach(slot => {
            if (dayMap[slot.dayOfWeek]) {
              dayMap[slot.dayOfWeek].push({
                startTime: slot.startTime,
                endTime: slot.endTime,
                teacherName: teacherNames,
                className: cls.name,
                classGrade: cls.grade || '',
                classStream: cls.stream || '',
                classSubject: cls.subject || ''
              });
            }
          });
        }
      });

      // 2. From direct Teacher timetables (if any legacy slots)
      (teachersRes || []).forEach(teacher => {
        if (teacher.timetables) {
          teacher.timetables.forEach(slot => {
            if (slot.dayOfWeek && dayMap[slot.dayOfWeek] && !slot.classId) {
              dayMap[slot.dayOfWeek].push({
                startTime: slot.startTime,
                endTime: slot.endTime,
                teacherName: teacher.name,
                className: teacher.classes && teacher.classes.length > 0 ? teacher.classes.map(c => c.name).join(', ') : 'Direct Slot',
                classGrade: ''
              });
            }
          });
        }
      });

      // Sort slots by start time
      DAYS.forEach(d => {
        dayMap[d].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
      });

      setSchedule(dayMap);
    } catch (err) {
      toast.error('Failed to load schedule data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in w-full min-h-full">
      
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-brand-accent/20 p-3 rounded-xl border border-brand-accent/30 shadow-[0_0_15px_rgba(225,29,72,0.3)]">
           <Calendar className="text-brand-accent" size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-white">Weekly Class Schedule</h2>
          <p className="text-gray-400 text-sm">View the physical campus timetable by day.</p>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl shadow-2xl">
        
        {loading ? (
          <div className="flex justify-center items-center py-32">
            <div className="w-10 h-10 border-4 border-brand-accent border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="overflow-x-auto pb-4 custom-scrollbar">
            <div className="grid grid-cols-7 gap-4 min-w-[1200px] items-start">
              {DAYS.map(day => {
                const slots = schedule[day] || [];
                return (
                  <div key={day} className="flex flex-col bg-black/20 rounded-2xl border border-white/5 overflow-hidden min-h-[300px]">
                    {/* Day Header */}
                    <div className="bg-gradient-to-r from-brand-accent/20 to-transparent px-4 py-3 border-b border-white/10">
                      <h4 className="text-white font-bold tracking-wider uppercase text-sm text-center">{day}</h4>
                    </div>
                    
                    {/* Slots Container */}
                    <div className="p-3 flex-1 flex flex-col gap-3">
                      {slots.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500/50">
                          <Clock size={32} className="mb-2 opacity-20" />
                          <span className="text-xs font-semibold uppercase tracking-wider text-center">No Classes</span>
                        </div>
                      ) : (
                        slots.map((slot, idx) => (
                          <div key={idx} className="flex flex-col items-center bg-white/5 p-3 rounded-xl border border-white/10 hover:border-brand-accent/30 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-accent/10">
                            <span className="text-sm font-black text-brand-accent tracking-wide">{slot.startTime}</span>
                            <span className="text-[10px] text-gray-500 uppercase my-0.5 font-bold">to</span>
                            <span className="text-sm font-black text-brand-accent tracking-wide mb-2">{slot.endTime}</span>
                            
                            <div className="w-full pt-2 border-t border-white/10 text-center">
                              <h5 className="font-bold text-white text-xs leading-tight mb-1">
                                {slot.className}
                                {slot.classGrade && <span className="ml-1 text-[9px] bg-brand-accent/20 text-brand-accent px-1.5 py-0.5 rounded-full">{slot.classGrade}</span>}
                              </h5>
                              <p className="text-[10px] text-gray-400 font-medium truncate">
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
        )}
      </div>

    </div>
  );
}
