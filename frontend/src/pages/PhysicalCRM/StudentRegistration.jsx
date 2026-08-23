import React, { useState, useEffect, useRef } from 'react';
import { physicalCrmService } from '../../api/physicalCrm';
import { physicalFinanceService } from '../../api/physicalFinance';
import SchoolManagerModal from '../../components/PhysicalCRM/SchoolManagerModal';
import { User, Search, GraduationCap, Users, Filter, Edit2, Trash2, X, FileSpreadsheet, Upload, Loader2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

const initialFormData = {
  studentName: '',
  nic: '',
  classId: '',
  classIds: [],
  schoolId: '',
  phone: '',
  address: '',
  gender: '',
  dob: '',
  guardianName: '',
  guardianPhone: '',
  rfid: '',
  registrationFeeAmount: '',
  registrationFeeStatus: 'PENDING'
};

export default function StudentRegistration() {
  const [students, setStudents] = useState([]);
  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);
  
  // Bulk Excel Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [importClassId, setImportClassId] = useState('');
  const [importSchoolId, setImportSchoolId] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');

  // Form State
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [studentsRes, schoolsRes, classesRes, regFeeRes] = await Promise.all([
        physicalCrmService.getStudents(),
        physicalCrmService.getSchools(),
        physicalCrmService.getClasses(),
        physicalFinanceService.getDefaultRegFee()
      ]);
      setStudents(studentsRes || []);
      setSchools(schoolsRes || []);
      setClasses(classesRes || []);
      if (regFeeRes && regFeeRes.amount) {
        setFormData(prev => ({ ...prev, registrationFeeAmount: regFeeRes.amount }));
      }
    } catch (err) {
      toast.error('Failed to load student data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditClick = (student) => {
    setEditingStudentId(student.id);
    const existingClassIds = student.enrollments && student.enrollments.length > 0 
      ? student.enrollments.map(e => e.classId) 
      : (student.classId ? [student.classId] : []);

    setFormData({
      studentName: student.studentName || `${student.firstName || ''} ${student.lastName || ''}`.trim(),
      nic: student.nic || '',
      classId: student.classId || (existingClassIds[0] || ''),
      classIds: existingClassIds,
      schoolId: student.schoolId || '',
      phone: student.phone || '',
      address: student.address || '',
      gender: student.gender || '',
      dob: student.dob || '',
      guardianName: student.guardianName || '',
      guardianPhone: student.guardianPhone || '',
      rfid: student.rfid || '',
      registrationFeeAmount: student.registrationFeeAmount || '',
      registrationFeeStatus: student.registrationFeeStatus || 'PENDING'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingStudentId(null);
    setFormData(initialFormData);
  };

  const handleDeleteClick = async (student) => {
    const sName = student.studentName || `${student.firstName || ''} ${student.lastName || ''}`.trim();
    if (window.confirm(`Are you sure you want to delete "${sName}" (${student.studentId})?`)) {
      try {
        await physicalCrmService.deleteStudent(student.id);
        toast.success(`Student "${sName}" deleted successfully.`);
        fetchData();
      } catch (err) {
        console.error('Error deleting student:', err);
        toast.error(err.response?.data?.error || 'Failed to delete student.');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingStudentId) {
        await physicalCrmService.updateStudent(editingStudentId, formData);
        toast.success('Student updated successfully!');
      } else {
        await physicalCrmService.createStudent(formData);
        toast.success('Student registered successfully!');
      }
      setFormData(initialFormData);
      setEditingStudentId(null);
      fetchData();
    } catch (err) {
      toast.error(editingStudentId ? 'Update failed' : 'Registration failed');
    }
  };

  const handleExcelFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setExcelFile(file);
      setImportResult(null);
    }
  };

  const handleExcelImportSubmit = async (e) => {
    e.preventDefault();
    if (!excelFile) {
      toast.error('Please select an Excel file to import.');
      return;
    }

    try {
      setImporting(true);
      const data = new FormData();
      data.append('excel', excelFile);
      if (importClassId) data.append('defaultClassId', importClassId);
      if (importSchoolId) data.append('defaultSchoolId', importSchoolId);

      const res = await physicalCrmService.importExcelStudents(data);
      if (res && res.success) {
        setImportResult(res);
        toast.success(`Done! Updated ${res.updatedCount || 0} student profiles & added ${res.importedCount || 0} new students!`);
        fetchData();
      } else {
        toast.error(res.error || 'Import failed.');
      }
    } catch (err) {
      console.error('Error importing Excel students:', err);
      toast.error(err.response?.data?.error || 'Bulk Excel import failed.');
    } finally {
      setImporting(false);
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterClassChange = (e) => {
    setFilterClass(e.target.value);
    setCurrentPage(1);
  };

  const filteredStudents = students.filter(s => {
    const term = searchTerm.trim().toLowerCase();
    const sName = (s.studentName || `${s.firstName || ''} ${s.lastName || ''}`).toLowerCase();
    const sId = (s.studentId || '').toLowerCase();
    const sPhone = (s.phone || '').toLowerCase();
    const sNic = (s.nic || '').toLowerCase();
    const sGuardianPhone = (s.guardianPhone || '').toLowerCase();

    const matchSearch = !term || sName.includes(term) || sId.includes(term) || sPhone.includes(term) || sNic.includes(term) || sGuardianPhone.includes(term);
    const matchClass = filterClass ? s.classId?.toString() === filterClass : true;
    return matchSearch && matchClass;
  });

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage) || 1;
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const inputBaseClass = "w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-brand-accent/50 outline-none text-white transition-all shadow-inner placeholder:text-white/30";

  return (
    <div className="space-y-4 w-full min-h-full pb-10 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white drop-shadow-md">
            Physical Student Registration
          </h1>
          <p className="text-white/60 mt-1">Register new physical students and manage existing campus enrollments.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Excel Import Button */}
          <button
            onClick={() => {
              setIsImportModalOpen(true);
              setExcelFile(null);
              setImportResult(null);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold rounded-xl text-sm shadow-lg shadow-emerald-600/30 transition-all outline-none"
          >
            <FileSpreadsheet size={18} /> Import Students (Excel/CSV) 📊
          </button>

          {/* Counter */}
          <div className="flex items-center gap-3 px-4 py-2 bg-black/40 rounded-xl backdrop-blur-md border border-white/20 text-white">
            <Users className="text-brand-accent" size={20} />
            <div>
              <p className="text-[9px] text-white/50 font-bold uppercase tracking-wider">Total Enrolled</p>
              <p className="text-base font-extrabold text-white">{students.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Form Section */}
        <div className="lg:col-span-1">
          <div className="bg-black/40 backdrop-blur-xl border border-white/20 p-6 rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.3)] relative overflow-hidden flex flex-col text-white">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
            
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2 drop-shadow-md">
                {editingStudentId ? (
                  <><Edit2 size={20} className="text-brand-accent" /> Edit Student</>
                ) : (
                  <><User size={20} className="text-brand-accent" /> New Registration</>
                )}
              </h2>
              {editingStudentId && (
                <button onClick={cancelEdit} className="text-gray-500 hover:text-red-500 transition-colors flex items-center gap-1 text-sm font-semibold">
                  <X size={16} /> Cancel Edit
                </button>
              )}
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4 flex-1">
              {/* Student Name & ID Number */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1">Student Name *</label>
                  <input 
                    type="text" 
                    name="studentName" 
                    required 
                    placeholder="Full Student Name"
                    value={formData.studentName} 
                    onChange={handleInputChange} 
                    className={inputBaseClass} 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1">NIC / National ID (Optional)</label>
                  <input 
                    type="text" 
                    name="nic" 
                    placeholder="Optional (e.g. NIC)" 
                    value={formData.nic} 
                    onChange={handleInputChange} 
                    className={inputBaseClass} 
                  />
                </div>
              </div>

              {/* Class & School */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1">Allocate Classes (Multi-Class Support) *</label>
                  
                  {/* Selected Class Badges */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {(formData.classIds || []).map(cId => {
                      const cls = classes.find(c => c.id === parseInt(cId));
                      if (!cls) return null;
                      return (
                        <span key={cId} className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-accent/20 border border-brand-accent/40 text-brand-accent rounded-lg text-xs font-bold shadow-sm">
                          {cls.name}
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => {
                                const newIds = (prev.classIds || []).filter(id => id !== cId);
                                return { ...prev, classIds: newIds, classId: newIds[0] || '' };
                              });
                            }}
                            className="hover:text-red-400 font-extrabold ml-1 text-sm"
                            title="Remove Class"
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>

                  <select
                    value=""
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (val && (!formData.classIds || !formData.classIds.includes(val))) {
                        setFormData(prev => {
                          const newIds = [...(prev.classIds || []), val];
                          return { ...prev, classIds: newIds, classId: newIds[0] };
                        });
                      }
                    }}
                    className={inputBaseClass + " appearance-none font-medium text-xs"}
                  >
                    <option value="" className="text-black">+ Add a Class to Student...</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id} className="text-black" disabled={formData.classIds?.includes(c.id)}>
                        {c.name} ({c.grade}) {formData.classIds?.includes(c.id) ? '✓ Enrolled' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-1">
                    <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider">School *</label>
                    <button type="button" onClick={() => setIsSchoolModalOpen(true)} className="text-xs font-semibold text-brand-accent hover:text-brand-accentHover transition-colors">
                      + Manage
                    </button>
                  </div>
                  <select name="schoolId" value={formData.schoolId} onChange={handleInputChange} required className={inputBaseClass + " appearance-none font-medium"}>
                    <option value="" className="text-black">Select a School</option>
                    {schools.map(s => (
                      <option key={s.id} value={s.id} className="text-black">{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Phone & Address */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1">Phone Number</label>
                  <input type="text" name="phone" placeholder="07XXXXXXXX" value={formData.phone} onChange={handleInputChange} className={inputBaseClass} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1">Address</label>
                  <input type="text" name="address" placeholder="Home / Residential Address" value={formData.address} onChange={handleInputChange} className={inputBaseClass} />
                </div>
              </div>

              {/* Gender & DOB */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1">Gender</label>
                  <select name="gender" value={formData.gender} onChange={handleInputChange} className={inputBaseClass + " appearance-none"}>
                    <option value="" className="text-black">Select Gender</option>
                    <option value="Female" className="text-black">Female</option>
                    <option value="Male" className="text-black">Male</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1">Date of Birth</label>
                  <input type="text" name="dob" placeholder="YYYY-MM-DD" value={formData.dob} onChange={handleInputChange} className={inputBaseClass} />
                </div>
              </div>

              {/* Guardian Details */}
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10 mt-4 shadow-inner">
                <h3 className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-3">Parent / Guardian Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <input type="text" name="guardianName" placeholder="Parent / Guardian Name" value={formData.guardianName} onChange={handleInputChange} className={inputBaseClass} />
                  </div>
                  <div>
                    <input type="text" name="guardianPhone" placeholder="Parent Mobile (Optional)" value={formData.guardianPhone} onChange={handleInputChange} className={inputBaseClass} />
                  </div>
                </div>
              </div>

              {/* RFID Card Scanner */}
              <div className="mt-4">
                <label className="block text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">💳 Card Scanner (Tap Here & Scan)</label>
                <input type="text" name="rfid" placeholder="Scan ID Card here..." value={formData.rfid} onChange={handleInputChange} className={`${inputBaseClass} border-emerald-500/30 focus:ring-emerald-500/50 bg-emerald-500/5 text-emerald-100 placeholder:text-emerald-500/50`} />
              </div>

              {/* Registration Fee */}
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10 mt-4 shadow-inner">
                <h3 className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-3">Registration Fee</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                  <div>
                    <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1">Fee Amount (LKR)</label>
                    <div className="flex gap-2">
                      <input type="number" name="registrationFeeAmount" placeholder="Amount" value={formData.registrationFeeAmount} onChange={handleInputChange} className={inputBaseClass} />
                      <button type="button" onClick={async () => {
                        try {
                          await physicalFinanceService.setDefaultRegFee(formData.registrationFeeAmount);
                          toast.success('Default Fee Updated!');
                        } catch(err){
                          toast.error('Failed to update default fee');
                        }
                      }} className="px-3 bg-white/10 text-xs rounded-xl hover:bg-white/20 whitespace-nowrap">Save</button>
                    </div>
                  </div>
                  <div>
                     <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1">Fee Status</label>
                     <select name="registrationFeeStatus" value={formData.registrationFeeStatus} onChange={handleInputChange} className={inputBaseClass + " appearance-none font-bold " + (formData.registrationFeeStatus === 'PAID' ? 'text-emerald-400' : 'text-amber-400')}>
                        <option value="PENDING" className="text-black">PENDING</option>
                        <option value="PAID" className="text-black">PAID</option>
                     </select>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button type="submit" className="w-full py-3.5 bg-brand-accent hover:bg-brand-accentHover text-white rounded-xl font-semibold shadow-lg shadow-brand-accent/30 hover:shadow-brand-accent/50 transition-all transform hover:-translate-y-0.5">
                  {editingStudentId ? 'Update Student' : 'Register Student'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* List Section */}
        <div className="lg:col-span-1">
          <div className="bg-black/40 backdrop-blur-xl border border-white/20 p-6 rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.3)] flex flex-col h-full max-h-[780px] text-white">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2 whitespace-nowrap drop-shadow-md">
                <GraduationCap size={20} className="text-brand-accent" /> Registered Students
              </h2>
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                  <input 
                    type="text" 
                    placeholder="Search Name, ID, Phone..." 
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className="pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-full focus:ring-2 focus:ring-brand-accent/50 outline-none text-white text-xs w-full sm:w-44 transition-all shadow-inner placeholder:text-white/30" 
                  />
                </div>
                <div className="relative flex-1 sm:flex-initial">
                  <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                  <select 
                    value={filterClass} 
                    onChange={handleFilterClassChange} 
                    className="pl-8 pr-6 py-1.5 bg-white/5 border border-white/10 rounded-full focus:ring-2 focus:ring-brand-accent/50 outline-none text-white text-xs w-full sm:w-32 transition-all appearance-none shadow-inner"
                  >
                    <option value="" className="text-black">All Classes</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id} className="text-black">{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center flex-1 py-12">
                <div className="w-8 h-8 border-4 border-brand-accent border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 text-gray-400 py-12">
                <Users size={48} className="mb-4 opacity-50" />
                <p>No students found matching your search.</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-between overflow-hidden">
                {/* Scrollable Cards Grid */}
                <div className="overflow-y-auto pr-2 custom-scrollbar max-h-[580px]">
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 pb-4">
                    {paginatedStudents.map(student => (
                      <div key={student.id} className="group bg-white/5 border border-white/10 p-5 rounded-2xl hover:border-brand-accent/50 hover:bg-white/10 hover:shadow-lg transition-all relative overflow-hidden flex flex-col justify-between shadow-inner">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-brand-accent/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                        
                        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10 opacity-0 group-hover:opacity-100 transition-all">
                          <button 
                            onClick={() => handleEditClick(student)}
                            className="p-1.5 bg-black/40 hover:bg-brand-accent rounded-lg text-gray-300 hover:text-white transition-all border border-white/10"
                            title="Edit Student"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(student)}
                            className="p-1.5 bg-black/40 hover:bg-red-600 rounded-lg text-gray-300 hover:text-white transition-all border border-white/10"
                            title="Delete Student"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                        
                        <div>
                          <div className="flex justify-between items-start mb-3 pr-8">
                            <div>
                              <h3 className="font-bold text-white text-base drop-shadow-md">
                                {student.studentName || `${student.firstName} ${student.lastName}`}
                              </h3>
                              <p className="text-xs text-gray-400 font-mono">{student.studentId} {student.nic ? `• ${student.nic}` : ''}</p>
                            </div>
                            <div className="flex flex-wrap gap-1 max-w-[150px] justify-end">
                              {student.enrollments && student.enrollments.length > 0 ? (
                                student.enrollments.map(e => (
                                  <span key={e.id} className="px-2 py-0.5 bg-brand-accent/20 border border-brand-accent/40 text-brand-accent rounded-md text-[10px] font-bold">
                                    {e.class?.name || 'Class'}
                                  </span>
                                ))
                              ) : (
                                <span className="px-2.5 py-1 bg-brand-accent/10 text-brand-accent rounded-full text-[11px] font-bold whitespace-nowrap">
                                  {student.class ? student.class.name : (student.grade || 'No Class')}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="space-y-1 mb-3 text-xs text-white/80">
                            {student.phone && <p>📞 Phone: {student.phone}</p>}
                            {student.address && <p className="truncate">🏠 {student.address}</p>}
                            {student.guardianPhone && <p>👪 Parent Mobile: {student.guardianPhone}</p>}
                          </div>
                        </div>
                        
                        <div className="pt-2.5 border-t border-white/10 flex justify-between items-center text-[10px] text-white/50 uppercase tracking-wider font-bold">
                          <span>School: <span className="font-semibold text-white/80">{student.school?.name || 'N/A'}</span></span>
                          <span>Parent: <span className="font-semibold text-white/80">{student.guardianName || 'N/A'}</span></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pagination Controls */}
                <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/70">
                  <span>
                    Showing <strong className="text-white">{(currentPage - 1) * itemsPerPage + 1}</strong> - <strong className="text-white">{Math.min(currentPage * itemsPerPage, filteredStudents.length)}</strong> of <strong className="text-white">{filteredStudents.length}</strong>
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 rounded-lg text-white font-semibold transition-all border border-white/10"
                    >
                      ← Prev
                    </button>
                    <span className="px-2 font-mono font-bold text-white">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 rounded-lg text-white font-semibold transition-all border border-white/10"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BULK EXCEL IMPORT MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-white/20 rounded-3xl p-6 sm:p-8 max-w-xl w-full text-white shadow-2xl relative space-y-6">
            <button
              onClick={() => setIsImportModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-2"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/20 rounded-2xl border border-emerald-500/30 text-emerald-400">
                <FileSpreadsheet size={28} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Import Students from Excel / CSV 📊</h3>
                <p className="text-xs text-gray-400">Upload bulk student records directly into the physical database</p>
              </div>
            </div>

            <form onSubmit={handleExcelImportSubmit} className="space-y-5">
              {/* File Dropzone */}
              <div className="border-2 border-dashed border-emerald-500/30 hover:border-emerald-500/60 rounded-2xl p-6 text-center bg-black/40 relative">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xlsx, .xls, .csv"
                  onChange={handleExcelFileSelect}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                  <Upload size={32} className="text-emerald-400" />
                  {excelFile ? (
                    <div>
                      <p className="text-sm font-extrabold text-emerald-300">{excelFile.name}</p>
                      <p className="text-[11px] text-gray-400">{(excelFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-bold text-white">Select or Drop Excel (.xlsx, .csv) File</p>
                      <p className="text-[11px] text-gray-400">Supports id_number, student_name, phone_number, address, gender, date_of_birth, parent_name, parent_mobile</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Default Class & School Filters */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Batch Class (Optional)</label>
                  <select
                    value={importClassId}
                    onChange={(e) => setImportClassId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-black/60 border border-white/10 rounded-xl text-xs text-white outline-none"
                  >
                    <option value="" className="text-black">No Class (Assign Later)</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id} className="text-black">{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Batch School (Optional)</label>
                  <select
                    value={importSchoolId}
                    onChange={(e) => setImportSchoolId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-black/60 border border-white/10 rounded-xl text-xs text-white outline-none"
                  >
                    <option value="" className="text-black">No School (Assign Later)</option>
                    {schools.map(s => (
                      <option key={s.id} value={s.id} className="text-black">{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Import Result Feedback */}
              {importResult && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-start gap-3">
                  <CheckCircle2 size={24} className="text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-extrabold text-emerald-300">Import & Update Completed! 🎉</h4>
                    <p className="text-xs text-emerald-200/80 leading-relaxed mt-0.5">
                      Successfully updated <strong className="text-white">{importResult.updatedCount || 0}</strong> existing student records with Address, Gender, DOB & Parent details, and created <strong className="text-white">{importResult.importedCount || 0}</strong> new students!
                    </p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={importing || !excelFile}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 uppercase text-xs tracking-wider disabled:opacity-50 outline-none"
              >
                {importing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Importing 2,000+ Students...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet size={18} /> Start Bulk Import 🚀
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      <SchoolManagerModal 
        isOpen={isSchoolModalOpen} 
        onClose={() => {
          setIsSchoolModalOpen(false);
          physicalCrmService.getSchools().then(setSchools);
        }} 
      />
    </div>
  );
}
