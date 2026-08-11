import React, { useState } from 'react';
import { User, Phone, MapPin, CreditCard, ShieldCheck, CheckCircle, Smartphone } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../api/axios';

export default function StudentRegistrationTab() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    nic: '',
    phone: '',
    address: '',
    guardianName: '',
    guardianPhone: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [generatedId, setGeneratedId] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.phone) {
      toast.error('First Name, Last Name, and Phone are required.');
      return;
    }
    
    setIsLoading(true);
    try {
      // Assuming api.post exists, otherwise fallback to fetch
      const response = await api.post('/physical-students', formData);
      toast.success('Physical Student Registered Successfully!');
      setGeneratedId(response.data.student.studentId);
      
      // Optionally reset form after short delay if needed
      // setFormData({ firstName: '', lastName: '', nic: '', phone: '', address: '', guardianName: '', guardianPhone: '' });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 w-full h-full">
      
      {/* Registration Form (Left Side) */}
      <div className="flex-1 bg-[#1e293b]/80 p-8 rounded-2xl shadow-xl border border-white/10 backdrop-blur-md">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <User className="text-brand-accent" />
          Physical Student Registration
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">First Name</label>
              <input 
                type="text" 
                name="firstName" 
                value={formData.firstName} 
                onChange={handleChange}
                className="w-full bg-[#0B1120] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all"
                placeholder="e.g. Kasun"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Last Name</label>
              <input 
                type="text" 
                name="lastName" 
                value={formData.lastName} 
                onChange={handleChange}
                className="w-full bg-[#0B1120] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all"
                placeholder="e.g. Perera"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">NIC / ID Number</label>
              <input 
                type="text" 
                name="nic" 
                value={formData.nic} 
                onChange={handleChange}
                className="w-full bg-[#0B1120] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all"
                placeholder="e.g. 200112345678"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Phone Number</label>
              <input 
                type="text" 
                name="phone" 
                value={formData.phone} 
                onChange={handleChange}
                className="w-full bg-[#0B1120] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all"
                placeholder="e.g. 0712345678"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Address</label>
            <textarea 
              name="address" 
              value={formData.address} 
              onChange={handleChange}
              rows="3"
              className="w-full bg-[#0B1120] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all resize-none"
              placeholder="Full Address"
            ></textarea>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-white/5 p-4 rounded-xl border border-white/5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Guardian Name</label>
              <input 
                type="text" 
                name="guardianName" 
                value={formData.guardianName} 
                onChange={handleChange}
                className="w-full bg-[#0B1120] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all"
                placeholder="e.g. Nimal Perera"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Guardian Phone</label>
              <input 
                type="text" 
                name="guardianPhone" 
                value={formData.guardianPhone} 
                onChange={handleChange}
                className="w-full bg-[#0B1120] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all"
                placeholder="e.g. 0771234567"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full mt-6 bg-gradient-to-r from-brand-accent to-rose-600 hover:from-rose-600 hover:to-brand-accent text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(225,29,72,0.4)] transition-all flex justify-center items-center gap-2"
          >
            {isLoading ? 'Registering...' : <><ShieldCheck size={20} /> Register & Generate ID</>}
          </button>
        </form>
      </div>

      {/* Virtual ID Preview (Right Side) */}
      <div className="w-full lg:w-96 flex flex-col items-center justify-center bg-black/20 p-8 rounded-2xl shadow-inner border border-white/5">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-8">Live ID Preview</h3>
        
        {/* ID Card Wrapper */}
        <div className="relative w-80 h-[500px] bg-gradient-to-b from-[#1e293b] to-[#0B1120] rounded-2xl shadow-2xl border-2 border-brand-accent/30 overflow-hidden group">
          
          {/* Glassmorphism Top Banner */}
          <div className="absolute top-0 w-full h-32 bg-gradient-to-r from-brand-accent to-purple-600 opacity-20 blur-2xl"></div>
          
          <div className="relative z-10 flex flex-col items-center pt-8">
            <img src="/logo.png" alt="IMA Campus" className="h-10 mb-6 drop-shadow-md" onError={(e) => e.target.style.display = 'none'} />
            
            {/* Profile Photo Placeholder */}
            <div className="w-28 h-28 bg-[#0B1120] border-4 border-white/10 rounded-xl flex items-center justify-center shadow-lg overflow-hidden mb-6">
              <User size={48} className="text-slate-600" />
            </div>

            <div className="text-center px-4 w-full">
              <h2 className="text-2xl font-black text-white tracking-wide truncate">
                {formData.firstName || 'First'} {formData.lastName || 'Last'}
              </h2>
              <p className="text-brand-accent font-semibold text-sm mt-1 tracking-wider">
                {generatedId || 'PHY-XX-XXXX'}
              </p>
            </div>

            <div className="w-full px-6 mt-8 space-y-3">
              <div className="flex items-center gap-3 text-slate-300 bg-white/5 p-2 rounded-lg">
                <CreditCard size={14} className="text-slate-400" />
                <span className="text-xs truncate">{formData.nic || 'NIC Number'}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-300 bg-white/5 p-2 rounded-lg">
                <Smartphone size={14} className="text-slate-400" />
                <span className="text-xs truncate">{formData.phone || 'Phone Number'}</span>
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="absolute bottom-0 w-full bg-brand-accent/20 border-t border-brand-accent/40 p-3 text-center">
              <p className="text-[10px] font-bold text-white uppercase tracking-widest">Physical Campus Student</p>
            </div>
          </div>
        </div>

        {generatedId && (
          <div className="mt-8 flex items-center gap-2 text-emerald-400 bg-emerald-400/10 px-4 py-2 rounded-full border border-emerald-400/20 animate-fade-in-up">
            <CheckCircle size={16} />
            <span className="text-sm font-bold">ID Generated successfully!</span>
          </div>
        )}
        <p className="text-xs text-slate-500 mt-4 text-center">This card can be printed directly or downloaded.</p>
      </div>
    </div>
  );
}
