import React, { useState, useEffect, useRef } from 'react';
import { physicalCrmService } from '../../api/physicalCrm';
import TimetableEditor from '../../components/PhysicalCRM/TimetableEditor';
import { BookOpen, Users, Calendar, Upload, Plus, Trash2, Edit2, Camera, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ClassTeacherManagement() {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Constants for Streams and Subjects
  const STREAMS = ['Science', 'Commerce', 'Arts', 'Technology', 'Other'];
  const STREAM_SUBJECTS = {
    'Science': ['Physics', 'Chemistry', 'Biology', 'Combined Maths', 'Custom'],
    'Commerce': ['Accounting', 'Business Studies', 'Economics', 'Custom'],
    'Arts': ['Media', 'Logic', 'Sinhala', 'Political Science', 'Geography', 'History', 'Custom'],
    'Technology': ['SFT', 'ET', 'BST', 'ICT', 'Agri', 'Custom'],
    'Other': ['Custom']
  };

  // Class Form State
  const [classForm, setClassForm] = useState({ name: '', grade: '', stream: '', subject: '', customSubject: '' });
  
  // Search States
  const [activeClassSearch, setActiveClassSearch] = useState('');
  const [teacherClassSearch, setTeacherClassSearch] = useState('');
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  
  // Teacher Form State
  const [teacherForm, setTeacherForm] = useState({
    name: '', address: '', whatsapp: '', phone: '', classIds: [], instituteCut: 0, image: null, timetables: []
  });
  const fileInputRef = useRef(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [clsRes, tchRes] = await Promise.all([
        physicalCrmService.getClasses(),
        physicalCrmService.getTeachers()
      ]);
      setClasses(clsRes);
      setTeachers(tchRes);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // --- Class Handlers ---
  const handleClassSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...classForm };
      // Resolve custom subject
      if (payload.grade === 'Grade 12' || payload.grade === 'Grade 13') {
        if (payload.subject === 'Custom') {
          payload.subject = payload.customSubject;
        }
      } else {
        payload.stream = null;
        payload.subject = null;
      }
      
      await physicalCrmService.createClass(payload);
      toast.success('Class created!');
      setClassForm({ name: '', grade: '', stream: '', subject: '', customSubject: '' });
      fetchData();
    } catch (err) {
      toast.error('Failed to create class');
    }
  };

  const handleClassDelete = async (id) => {
    if(!window.confirm('Delete this class?')) return;
    try {
      await physicalCrmService.deleteClass(id);
      fetchData();
    } catch (err) {
      toast.error('Failed to delete class');
    }
  };

  // --- Teacher Handlers ---
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setTeacherForm(prev => ({ ...prev, image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTeacherSubmit = async (e) => {
    e.preventDefault();
    try {
      await physicalCrmService.createTeacher(teacherForm);
      toast.success('Teacher registered!');
      setTeacherForm({ name: '', address: '', whatsapp: '', phone: '', classIds: [], instituteCut: 0, image: null, timetables: [] });
      setImagePreview(null);
      fetchData();
    } catch (err) {
      toast.error('Failed to register teacher');
    }
  };

  const handleTeacherDelete = async (id) => {
    if(!window.confirm('Delete this teacher?')) return;
    try {
      await physicalCrmService.deleteTeacher(id);
      fetchData();
    } catch (err) {
      toast.error('Failed to delete teacher');
    }
  };

  return (
    <div className="space-y-4 w-full min-h-full pb-10 animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white drop-shadow-md">
            Class & Teacher Hub
          </h1>
          <p className="text-white/60 mt-1">Manage physical classes, assign teachers, and schedule timetables.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Classes */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Create Class */}
          <div className="bg-black/40 backdrop-blur-xl border border-white/20 p-6 rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.3)] relative overflow-hidden text-white">
            <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -ml-16 -mt-16 pointer-events-none"></div>
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 drop-shadow-md">
              <BookOpen size={20} className="text-blue-400" /> Create Class
            </h2>
            
            <form onSubmit={handleClassSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1">Grade</label>
                <select required value={classForm.grade} onChange={e => {
                  const newGrade = e.target.value;
                  const isAL = newGrade === 'Grade 12' || newGrade === 'Grade 13';
                  setClassForm({...classForm, grade: newGrade, stream: isAL ? (classForm.stream || '') : '', subject: isAL ? (classForm.subject || '') : ''});
                }} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500/30 outline-none text-white appearance-none shadow-inner">
                  <option value="" className="text-black">Allocate to Grade</option>
                  {[...Array(13)].map((_, i) => <option key={i+1} value={`Grade ${i+1}`} className="text-black">Grade {i+1}</option>)}
                </select>
              </div>

              {(classForm.grade === 'Grade 12' || classForm.grade === 'Grade 13') && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1">Stream</label>
                    <select required value={classForm.stream} onChange={e => setClassForm({...classForm, stream: e.target.value, subject: ''})} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500/30 outline-none text-white appearance-none shadow-inner">
                      <option value="" className="text-black">Select Stream</option>
                      {STREAMS.map(s => <option key={s} value={s} className="text-black">{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1">Subject</label>
                    <select required value={classForm.subject} onChange={e => setClassForm({...classForm, subject: e.target.value})} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500/30 outline-none text-white appearance-none shadow-inner" disabled={!classForm.stream}>
                      <option value="" className="text-black">Select Subject</option>
                      {classForm.stream && STREAM_SUBJECTS[classForm.stream]?.map(sub => (
                        <option key={sub} value={sub} className="text-black">{sub}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {classForm.subject === 'Custom' && (
                <div>
                  <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1">Custom Subject Name</label>
                  <input type="text" required placeholder="e.g. IT" value={classForm.customSubject} onChange={e => setClassForm({...classForm, customSubject: e.target.value})} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500/30 outline-none text-white placeholder:text-white/30 shadow-inner" />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1">Class Name</label>
                <input type="text" required placeholder="e.g. Science Batch 1" value={classForm.name} onChange={e => setClassForm({...classForm, name: e.target.value})} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500/30 outline-none text-white placeholder:text-white/30 shadow-inner" />
              </div>
              <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg hover:shadow-blue-500/30 transition-all">Add Class</button>
            </form>
          </div>

          {/* List Classes */}
          <div className="bg-black/40 backdrop-blur-xl border border-white/20 p-6 rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.3)] min-h-[300px] text-white flex flex-col">
             <div className="flex flex-col gap-3 mb-4">
               <h3 className="text-lg font-bold text-white drop-shadow-md">Active Classes</h3>
               <div className="relative w-full">
                 <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                 <input 
                   type="text" 
                   placeholder="Search classes..." 
                   value={activeClassSearch}
                   onChange={(e) => setActiveClassSearch(e.target.value)}
                   className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500/30 outline-none text-white text-sm placeholder:text-white/30 shadow-inner"
                 />
               </div>
             </div>
             
             <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar flex-1">
               {classes.filter(c => 
                 c.name.toLowerCase().includes(activeClassSearch.toLowerCase()) || 
                 c.grade.toLowerCase().includes(activeClassSearch.toLowerCase()) ||
                 (c.stream && c.stream.toLowerCase().includes(activeClassSearch.toLowerCase())) ||
                 (c.subject && c.subject.toLowerCase().includes(activeClassSearch.toLowerCase()))
               ).map(c => (
                 <div key={c.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10 shadow-inner">
                   <div>
                     <p className="font-bold text-white drop-shadow-sm flex items-center gap-2">
                       {c.name}
                       {c.stream && <span className="px-1.5 py-0.5 rounded-md bg-blue-500/20 text-blue-300 text-[9px] uppercase tracking-wider border border-blue-500/20">{c.stream}</span>}
                       {c.subject && <span className="px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[9px] uppercase tracking-wider border border-purple-500/20">{c.subject}</span>}
                     </p>
                     <p className="text-[10px] text-white/50 uppercase tracking-wider font-bold">{c.grade}</p>
                   </div>
                   <button onClick={() => handleClassDelete(c.id)} className="p-2 text-red-400 hover:bg-white/10 hover:text-red-300 rounded-lg transition-colors">
                     <Trash2 size={16} />
                   </button>
                 </div>
               ))}
             </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Teachers */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Register Teacher */}
          <div className="bg-black/40 backdrop-blur-xl border border-white/20 p-6 rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.3)] relative overflow-hidden text-white">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 drop-shadow-md">
              <Users size={20} className="text-purple-400" /> Teacher Registration
            </h2>
            
            <form onSubmit={handleTeacherSubmit} className="space-y-6">
              
              <div className="flex flex-col md:flex-row gap-6">
                {/* Profile Pic */}
                <div className="flex flex-col items-center gap-2">
                  <div 
                    onClick={() => fileInputRef.current.click()}
                    className="w-32 h-32 rounded-full border-2 border-dashed border-white/30 flex flex-col items-center justify-center cursor-pointer overflow-hidden group hover:border-purple-400 transition-colors bg-white/5 relative shadow-inner"
                  >
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <Camera size={32} className="text-white/40 group-hover:text-purple-400 mb-1 transition-colors" />
                        <span className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Upload Pic</span>
                      </>
                    )}
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera size={24} className="text-white" />
                    </div>
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                </div>

                {/* Info Fields */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1">Full Name</label>
                    <input type="text" required value={teacherForm.name} onChange={e => setTeacherForm({...teacherForm, name: e.target.value})} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500/30 outline-none text-white shadow-inner" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1">Phone</label>
                    <input type="text" value={teacherForm.phone} onChange={e => setTeacherForm({...teacherForm, phone: e.target.value})} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500/30 outline-none text-white shadow-inner" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1">WhatsApp</label>
                    <input type="text" value={teacherForm.whatsapp} onChange={e => setTeacherForm({...teacherForm, whatsapp: e.target.value})} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500/30 outline-none text-white shadow-inner" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1">Address</label>
                    <input type="text" value={teacherForm.address} onChange={e => setTeacherForm({...teacherForm, address: e.target.value})} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500/30 outline-none text-white shadow-inner" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider mb-2">Allocate to Classes (Max 3)</label>
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="relative flex-1">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                          <input 
                            type="text" 
                            placeholder="Search classes to allocate..." 
                            value={teacherClassSearch}
                            onChange={(e) => setTeacherClassSearch(e.target.value)}
                            onFocus={() => setShowClassDropdown(true)}
                            className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500/30 outline-none text-white text-sm shadow-inner"
                          />
                        </div>
                        {teacherForm.classIds.length > 0 && (
                          <div className="text-xs font-bold text-purple-400 bg-purple-500/10 px-3 py-2.5 rounded-xl border border-purple-500/20 whitespace-nowrap">
                            {teacherForm.classIds.length}/3 Selected
                          </div>
                        )}
                      </div>
                      
                      {/* Selected Classes Pills */}
                      {teacherForm.classIds.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {teacherForm.classIds.map(id => {
                            const c = classes.find(cls => cls.id === id);
                            if (!c) return null;
                            return (
                              <div key={c.id} className="flex items-center gap-1 bg-purple-500/20 border border-purple-500/30 text-purple-300 px-2.5 py-1.5 rounded-lg text-xs font-bold">
                                <span>{c.name} ({c.grade})</span>
                                <button type="button" onClick={() => setTeacherForm({...teacherForm, classIds: teacherForm.classIds.filter(cid => cid !== c.id)})} className="hover:text-red-400 ml-1"><X size={12} /></button>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Dropdown / Search Results */}
                      {showClassDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-[#1a1a24] border border-white/20 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] max-h-60 overflow-y-auto custom-scrollbar p-2">
                          <div className="flex justify-between items-center mb-2 px-2">
                            <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Available Classes</span>
                            <button type="button" onClick={() => setShowClassDropdown(false)} className="text-white/40 hover:text-white"><X size={14} /></button>
                          </div>
                          <div className="space-y-1">
                            {classes.filter(c => c.name.toLowerCase().includes(teacherClassSearch.toLowerCase()) || c.grade.toLowerCase().includes(teacherClassSearch.toLowerCase())).map(c => (
                              <div 
                                key={c.id}
                                onClick={() => {
                                  const isSelected = teacherForm.classIds.includes(c.id);
                                  if (isSelected) {
                                    setTeacherForm({...teacherForm, classIds: teacherForm.classIds.filter(id => id !== c.id)});
                                  } else if (teacherForm.classIds.length < 3) {
                                    setTeacherForm({...teacherForm, classIds: [...teacherForm.classIds, c.id]});
                                  } else {
                                    toast.error('Maximum 3 classes can be allocated.');
                                  }
                                }}
                                className={`cursor-pointer px-3 py-2.5 rounded-lg text-sm transition-all flex items-center justify-between ${teacherForm.classIds.includes(c.id) ? 'bg-purple-500/20 text-purple-300 font-bold' : 'hover:bg-white/5 text-white/70'}`}
                              >
                                <span>{c.name} <span className="text-white/40 text-xs ml-1">({c.grade})</span></span>
                                {teacherForm.classIds.includes(c.id) && <span className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]"></span>}
                              </div>
                            ))}
                            {classes.length === 0 && <span className="text-xs text-white/40 italic p-2 block">No classes available. Create a class first.</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1">Institute Cut (%)</label>
                    <input type="number" min="0" max="100" value={teacherForm.instituteCut} onChange={e => setTeacherForm({...teacherForm, instituteCut: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500/30 outline-none text-white shadow-inner" />
                  </div>
                </div>
              </div>

              {/* Timetable Section */}
              <div className="mt-6 border-t border-gray-100 dark:border-brand-darkBorder pt-6">
                <TimetableEditor 
                  value={teacherForm.timetables} 
                  onChange={(val) => setTeacherForm({...teacherForm, timetables: val})} 
                  selectedClasses={classes.filter(c => teacherForm.classIds.includes(c.id))}
                />
              </div>

              <div className="flex justify-end pt-4">
                <button type="submit" className="px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold shadow-lg shadow-purple-500/30 transition-all">
                  Register Teacher
                </button>
              </div>
            </form>
          </div>

          {/* Teacher List */}
          <div className="bg-black/40 backdrop-blur-xl border border-white/20 p-6 rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.3)] text-white">
            <h3 className="text-lg font-bold text-white mb-4 drop-shadow-md">Registered Teachers</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {teachers.map(t => (
                <div key={t.id} className="p-4 bg-white/5 rounded-2xl border border-white/10 flex gap-4 shadow-inner">
                  {t.image ? (
                    <img src={t.image} alt={t.name} className="w-16 h-16 rounded-xl object-cover shadow-sm border border-white/20" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-xl font-bold text-white shadow-sm border border-white/20">
                      {t.name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-white leading-tight drop-shadow-sm">{t.name}</h4>
                      <button onClick={() => handleTeacherDelete(t.id)} className="text-white/40 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {t.classes && t.classes.map(c => (
                         <span key={c.id} className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20 uppercase tracking-wider">{c.name}</span>
                      ))}
                    </div>
                    {t.instituteCut > 0 && <p className="text-[10px] font-bold text-green-400 mt-1 uppercase tracking-wider">Inst. Cut: {t.instituteCut}%</p>}
                    
                    <div className="mt-2 flex flex-wrap gap-1">
                      {t.timetables && t.timetables.slice(0, 3).map((tt, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 bg-white/10 border border-white/20 rounded text-white/80 font-semibold" title={`${tt.startTime} - ${tt.endTime}`}>
                          {tt.dayOfWeek.slice(0, 3)} {tt.startTime}
                        </span>
                      ))}
                      {t.timetables && t.timetables.length > 3 && (
                        <span className="text-[10px] px-2 py-0.5 bg-white/5 border border-white/10 rounded text-white/50">+{t.timetables.length - 3}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
