import React, { useState, useEffect } from 'react';
import { physicalCrmService } from '../../api/physicalCrm';
import { physicalFinanceService } from '../../api/physicalFinance';
import SchoolManagerModal from '../../components/PhysicalCRM/SchoolManagerModal';
import { User, Search, GraduationCap, Users, Filter, Edit2, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function StudentRegistration() {
  const [students, setStudents] = useState([]);
  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');

  // Form State
  const [editingStudentId, setEditingStudentId] = useState(null);
  const initialFormData = {
    firstName: '', lastName: '', classId: '', nic: '', phone: '', whatsapp: '',
    address: '', schoolId: '', guardianName: '', guardianPhone: '', guardianWhatsapp: '', rfid: '',
    registrationFeeAmount: '', registrationFeeStatus: 'PENDING'
  };
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
      setStudents(studentsRes);
      setSchools(schoolsRes);
      setClasses(classesRes);
      if (regFeeRes && regFeeRes.amount) {
        setFormData(prev => ({ ...prev, registrationFeeAmount: regFeeRes.amount }));
      }
    } catch (err) {
      toast.error('Failed to load data');
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
    setFormData({
      firstName: student.firstName || '',
      lastName: student.lastName || '',
      classId: student.classId || '',
      nic: student.nic || '',
      phone: student.phone || '',
      whatsapp: student.whatsapp || '',
      address: student.address || '',
      schoolId: student.schoolId || '',
      guardianName: student.guardianName || '',
      guardianPhone: student.guardianPhone || '',
      guardianWhatsapp: student.guardianWhatsapp || '',
      rfid: student.rfid || '',
      registrationFeeAmount: student.registrationFeeAmount || '',
      registrationFeeStatus: student.registrationFeeStatus || 'PENDING'
    });
    // Scroll to top where the form is
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingStudentId(null);
    setFormData(initialFormData);
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

  const filteredStudents = students.filter(s => {
    const matchSearch = (s.firstName + ' ' + s.lastName).toLowerCase().includes(searchTerm.toLowerCase()) || 
                        (s.phone && s.phone.includes(searchTerm));
    const matchClass = filterClass ? s.classId?.toString() === filterClass : true;
    return matchSearch && matchClass;
  });

  // Base styles
  const inputBaseClass = "w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-brand-accent/50 outline-none text-white transition-all shadow-inner placeholder:text-white/30";

  return (
    <div className="space-y-4 w-full min-h-full pb-10 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white drop-shadow-md">
            Student Registration
          </h1>
          <p className="text-white/60 mt-1">Register new physical students and manage existing ones.</p>
        </div>
        <div className="flex items-center gap-4 bg-black/40 p-2 rounded-2xl backdrop-blur-md border border-white/20 text-white">
          <div className="flex items-center gap-3 px-4">
            <Users className="text-brand-accent" size={24} />
            <div>
              <p className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Total Enrolled</p>
              <p className="text-xl font-bold text-white drop-shadow-md">{students.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: 50/50 Layout for better landscape usage */}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1">First Name *</label>
                  <input type="text" name="firstName" required value={formData.firstName} onChange={handleInputChange} className={inputBaseClass} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1">Last Name *</label>
                  <input type="text" name="lastName" required value={formData.lastName} onChange={handleInputChange} className={inputBaseClass} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1">Allocate Class *</label>
                  <select name="classId" required value={formData.classId} onChange={handleInputChange} className={inputBaseClass + " appearance-none"}>
                    <option value="" className="text-black">Select Class</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id} className="text-black">{c.name} ({c.grade})</option>
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
                  <select name="schoolId" value={formData.schoolId} onChange={handleInputChange} required className={inputBaseClass + " appearance-none"}>
                    <option value="" className="text-black">Select a School</option>
                    {schools.map(s => (
                      <option key={s.id} value={s.id} className="text-black">{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1">Phone</label>
                  <input type="text" name="phone" placeholder="Optional" value={formData.phone} onChange={handleInputChange} className={inputBaseClass} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1">WhatsApp</label>
                  <input type="text" name="whatsapp" placeholder="Optional" value={formData.whatsapp} onChange={handleInputChange} className={inputBaseClass} />
                </div>
              </div>

              <div className="bg-white/5 p-4 rounded-2xl border border-white/10 mt-4 shadow-inner">
                <h3 className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-3">Guardian Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <input type="text" name="guardianName" placeholder="Guardian Name" value={formData.guardianName} onChange={handleInputChange} className={inputBaseClass} />
                  </div>
                  <input type="text" name="guardianPhone" placeholder="Phone (Optional)" value={formData.guardianPhone} onChange={handleInputChange} className={inputBaseClass} />
                  <input type="text" name="guardianWhatsapp" placeholder="WhatsApp (Optional)" value={formData.guardianWhatsapp} onChange={handleInputChange} className={inputBaseClass} />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">💳 Card Scanner (Tap Here & Scan)</label>
                <input type="text" name="rfid" placeholder="Scan ID Card here..." value={formData.rfid} onChange={handleInputChange} className={`${inputBaseClass} border-emerald-500/30 focus:ring-emerald-500/50 bg-emerald-500/5 text-emerald-100 placeholder:text-emerald-500/50`} />
              </div>

              <div className="bg-white/5 p-4 rounded-2xl border border-white/10 mt-4 shadow-inner">
                <h3 className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-3">Registration Fee</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
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
                      }} className="px-3 bg-white/10 text-xs rounded-xl hover:bg-white/20 whitespace-nowrap">Save as Default</button>
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
          <div className="bg-black/40 backdrop-blur-xl border border-white/20 p-6 rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.3)] flex flex-col h-full min-h-[600px] text-white">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2 whitespace-nowrap drop-shadow-md">
                <GraduationCap size={20} className="text-brand-accent" /> Registered
              </h2>
              <div className="flex gap-2 w-full md:w-auto">
                {/* Search */}
                <div className="relative flex-1 md:flex-none">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search name or phone..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-full focus:ring-2 focus:ring-brand-accent/50 outline-none text-white text-sm w-full md:w-48 transition-all shadow-inner placeholder:text-white/30" 
                  />
                </div>
                {/* Filter */}
                <div className="relative flex-1 md:flex-none">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <select 
                    value={filterClass} 
                    onChange={(e) => setFilterClass(e.target.value)} 
                    className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-full focus:ring-2 focus:ring-brand-accent/50 outline-none text-white text-sm w-full md:w-36 transition-all appearance-none shadow-inner"
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
              <div className="flex justify-center items-center flex-1">
                <div className="w-8 h-8 border-4 border-brand-accent border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 text-gray-400">
                <Users size={48} className="mb-4 opacity-50" />
                <p>No students found.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 pb-4">
                  {filteredStudents.map(student => (
                    <div key={student.id} className="group bg-white/5 border border-white/10 p-5 rounded-2xl hover:border-brand-accent/50 hover:bg-white/10 hover:shadow-lg transition-all relative overflow-hidden flex flex-col justify-between shadow-inner">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-brand-accent/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                      
                      {/* Edit Button */}
                      <button 
                        onClick={() => handleEditClick(student)}
                        className="absolute top-3 right-3 p-1.5 bg-black/10 dark:bg-white/10 rounded-lg text-gray-600 dark:text-gray-300 opacity-0 group-hover:opacity-100 hover:bg-brand-accent hover:text-white transition-all"
                        title="Edit Student"
                      >
                        <Edit2 size={14} />
                      </button>
                      
                      <div>
                        <div className="flex justify-between items-start mb-3 pr-8">
                          <div>
                            <h3 className="font-bold text-white text-lg drop-shadow-md">
                              {student.firstName} {student.lastName}
                            </h3>
                            <p className="text-xs text-gray-500">{student.studentId}</p>
                          </div>
                          <span className="px-3 py-1 bg-brand-accent/10 text-brand-accent rounded-full text-xs font-bold whitespace-nowrap">
                            {student.class ? student.class.name : (student.grade || 'No Class')}
                          </span>
                        </div>
                        
                        <div className="space-y-1.5 mb-4">
                          <p className="text-sm text-white/80 flex items-center gap-2">
                            <span className="w-4 h-4 rounded bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-[10px]">P</span>
                            {student.phone || 'N/A'}
                          </p>
                          <p className="text-sm text-white/80 flex items-center gap-2">
                            <span className="w-4 h-4 rounded bg-green-500/20 flex items-center justify-center text-green-400 font-bold text-[10px]">W</span>
                            {student.whatsapp || 'N/A'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="pt-3 border-t border-white/10 flex justify-between items-center text-[10px] text-white/50 uppercase tracking-wider font-bold">
                        <span>School: <span className="font-semibold text-white/80">{student.school?.name || 'N/A'}</span></span>
                        <span>GDN: <span className="font-semibold text-white/80">{student.guardianName || 'N/A'}</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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
