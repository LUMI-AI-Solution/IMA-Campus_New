import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; 
import axios from '../../api/axios';
import { FaPhoneAlt, FaCheckCircle, FaTimesCircle, FaUserSecret, FaKey, FaMapMarkerAlt, FaGraduationCap, FaCreditCard, FaTimes, FaArrowsAlt, FaChevronRight, FaChevronLeft } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useCall } from '../../contexts/CallContext';

export default function RightSidePanel({ selectedLead, activeMode, selectedBusiness, onBatchAssigned }) {
  const { startOutboundCall } = useCall();
  const [studentDetails, setStudentDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [lastResetPassword, setLastResetPassword] = useState(null);
  // 🔥 DRAG AND DROP STATE 🔥
  const [iframePos, setIframePos] = useState({ x: 50, y: 50 });
  const [ghostIframe, setGhostIframe] = useState(null);
  const [originalAdminSession, setOriginalAdminSession] = useState(null);

  // 🔥 MINIMIZE STATE 🔥
  const [isMinimized, setIsMinimized] = useState(false);

  // 🔥 BATCH ALLOCATION STATE 🔥
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [allocating, setAllocating] = useState(false);

  useEffect(() => {
    if (selectedLead?.phone) fetchStudentData();
    if (selectedLead?.batchId) {
      setSelectedBatchId(selectedLead.batchId.toString());
    } else {
      setSelectedBatchId('');
    }
  }, [selectedLead]);

  useEffect(() => {
    fetchBatches();
  }, [selectedBusiness]);

  const fetchBatches = async () => {
    try {
      const res = await axios.get('/public/landing-data');
      if (res.data && res.data.businesses) {
          let allBatches = [];
          if (selectedBusiness) {
              const biz = res.data.businesses.find(b => b.id === parseInt(selectedBusiness));
              allBatches = biz ? (biz.batches || []) : [];
          } else {
              allBatches = res.data.businesses.flatMap(biz => biz.batches || []);
          }
          setBatches(allBatches);
      }
    } catch (error) {
      console.error("Error fetching batches", error);
    }
  };

  const fetchStudentData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/coordinator-crm/lead-details/${selectedLead.phone}`);
      setStudentDetails(res.data);
    } catch (error) {
      console.error("Error fetching student details", error);
    }
    setLoading(false);
  };

  const handleGhostLogin = async () => {
      if(!window.confirm(`Are you sure you want to log in as ${studentDetails.student.firstName}?`)) return;
      try {
          toast.loading("Initiating Ghost Login...", { id: "ghost" });
          
          const res = await axios.post('/admin/ghost-login', { studentId: studentDetails.student.id });
          
          if (res.data.token) {
              const currentToken = localStorage.getItem('token');
              const currentUser = localStorage.getItem('user');
              setOriginalAdminSession({ token: currentToken, user: currentUser });

              localStorage.setItem('token', res.data.token);
              localStorage.setItem('user', JSON.stringify(res.data.user));
              
              // Set initial position centered
              setIframePos({ x: window.innerWidth / 2 - 450, y: window.innerHeight / 2 - 300 });
              setGhostIframe('/student/dashboard');
              toast.success("Ghost Login Active!", { id: "ghost" });
          }
      } catch (error) {
          toast.error("Ghost login failed. Check backend route path.", { id: "ghost" });
      }
  };

  const closeGhostLogin = () => {
      if (originalAdminSession) {
          localStorage.setItem('token', originalAdminSession.token);
          localStorage.setItem('user', originalAdminSession.user);
      }
      setGhostIframe(null);
      toast.success("Restored Admin Session.");
  };

  const handleResetPassword = async (e) => {
      e.preventDefault();
      try {
          await axios.post('/coordinator-crm/reset-password', { studentId: studentDetails.student.id, newPassword });
          toast.success("Password successfully reset!");
          setLastResetPassword(newPassword);
      } catch (error) {
          toast.error("Password reset failed.");
      }
  };

  const copyToClipboard = () => {
      navigator.clipboard.writeText(lastResetPassword);
      toast.success("Password Copied!");
      setTimeout(() => { setShowResetModal(false); setLastResetPassword(null); setNewPassword(''); }, 1000); 
  };

  const getPaymentOption = (payment) => {
      if (!payment) return "N/A";
      let typeStr = payment.payment_type === 1 ? "Monthly" : payment.payment_type === 2 ? "Installment" : "Full Payment";
      return `${typeStr} via ${payment.method || 'Slip'}`;
  };

  // 🔥 DRAG HANDLER LOGIC 🔥
  const handleDragStart = (e) => {
      const startX = e.clientX;
      const startY = e.clientY;
      const startPosX = iframePos.x;
      const startPosY = iframePos.y;

      const onMouseMove = (moveEvent) => {
          setIframePos({
              x: startPosX + (moveEvent.clientX - startX),
              y: startPosY + (moveEvent.clientY - startY),
          });
      };

      const onMouseUp = () => {
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
  };

  const handleAllocateBatch = async () => {
      if (!selectedBatchId) return toast.error("Please select a batch to allocate");
      try {
          setAllocating(true);
          const token = localStorage.getItem('token');
          await axios.post('/coordinator-crm/leads/update-batch', {
              leadId: selectedLead.id,
              batchId: selectedBatchId
          }, { headers: { Authorization: `Bearer ${token}` } });
          toast.success("Lead successfully allocated to batch!");
          // Trigger local state update
          if (onBatchAssigned) {
             onBatchAssigned(selectedLead.id, parseInt(selectedBatchId));
          } else if (selectedLead) {
             selectedLead.batchId = parseInt(selectedBatchId);
          }
      } catch (error) {
          toast.error("Failed to allocate batch.");
      } finally {
          setAllocating(false);
      }
  };

  return (
    <div className={`${isMinimized ? 'w-[70px]' : 'w-[300px] xl:w-[320px]'} transition-all duration-300 ease-in-out bg-[#23303f] rounded-2xl flex flex-col shrink-0 overflow-hidden text-slate-400 border border-white/5 shadow-lg relative`}>
      
      {isMinimized ? (
         // Minimized View
         <div className="h-full w-full flex flex-col items-center py-6 cursor-pointer hover:bg-white/5 transition-colors group" onClick={() => setIsMinimized(false)} title="Expand Panel">
            <button className="p-2 bg-black/20 group-hover:bg-blue-600/20 rounded-full hover:text-white mb-6 text-slate-500 group-hover:text-blue-400 transition-colors">
                <FaChevronLeft size={16} />
            </button>
            <div className="w-12 h-12 bg-[#2a3942] rounded-full border border-slate-600 flex items-center justify-center text-xl font-bold shadow-md text-slate-300">
               {selectedLead.name ? selectedLead.name.charAt(0).toUpperCase() : 'U'}
            </div>
         </div>
      ) : (
         // Expanded View
         <>
          <div className="bg-[#1a2430] p-6 flex flex-col items-center justify-center border-b border-white/5 relative">
            <button onClick={() => setIsMinimized(true)} className="absolute top-4 right-4 p-2 bg-black/20 rounded-full hover:bg-black/40 hover:text-white transition-colors text-slate-400" title="Minimize Panel">
               <FaChevronRight size={14}/>
            </button>

            <div className="w-20 h-20 bg-[#2a3942] rounded-full border border-slate-600 flex items-center justify-center text-3xl font-bold mb-3 shadow-md text-slate-300">
              {selectedLead.name ? selectedLead.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <h2 className="text-lg font-bold text-center text-slate-200">{selectedLead.name || 'Unknown Lead'}</h2>
            <div className="flex items-center gap-2 mt-2 text-xs bg-[#0b141a] px-3 py-1.5 rounded-full border border-slate-700 text-emerald-400">
              <FaPhoneAlt size={10} /> {selectedLead.phone}
            </div>
            {selectedLead?.waCallPermissionStatus === 'ALLOWED' && (
              <button 
                onClick={() => startOutboundCall && startOutboundCall({ lead: selectedLead, businessId: selectedLead?.batch?.businessId, campaignType: selectedLead?.campaignType || 'FREE_SEMINAR' })}
                className="w-full mt-3 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 transition-all hover:scale-[1.02]"
              >
                <FaPhoneAlt size={11} /> Call via WhatsApp (Allowed)
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] bg-[#23303f]">
            <div className="bg-[#1a2430] p-4 rounded-xl border border-white/5 mb-4 shadow-sm">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Lead Status</h3>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-slate-400">Phase</span>
                <span className="text-xs font-bold text-emerald-500">Phase {selectedLead.phase}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-400">Call Status</span>
                <span className="text-sm font-semibold capitalize text-slate-300">{selectedLead.callStatus}</span>
              </div>
            </div>

            <div className="bg-[#1a2430] p-4 rounded-xl border border-white/5 shadow-sm">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">System Records</h3>
              
              {loading ? (
                <div className="animate-pulse flex flex-col gap-2">
                  <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-700 rounded w-1/2"></div>
                </div>
              ) : studentDetails?.isEnrolled ? (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-emerald-500 font-bold bg-emerald-900/20 p-2.5 rounded-lg border border-emerald-900/50 text-xs">
                        <FaCheckCircle size={14}/> Registered Student
                    </div>

                    <div className="space-y-2.5">
                        <div className="text-xs">
                            <span className="text-slate-500 block mb-0.5">Full Name & ID</span>
                            <span className="text-slate-200 font-semibold">{studentDetails.student.firstName} {studentDetails.student.lastName} (ID: {studentDetails.student.id})</span>
                        </div>
                        <div className="text-xs">
                            <span className="text-slate-500 block mb-0.5"><FaMapMarkerAlt className="inline mr-1"/> Address</span>
                            <span className="text-slate-300">{studentDetails.student.addressHouseNo}, {studentDetails.student.addressStreet}, {studentDetails.student.city}</span>
                        </div>
                        
                        {(() => {
                            const uniqueEnrollments = studentDetails.student.payments?.reduce((acc, p) => {
                                const key = `${p.businessId}_${p.batchId}`;
                                if (!acc[key]) {
                                    acc[key] = { ...p, courses: p.courses ? [...p.courses] : [] };
                                } else {
                                    if(p.courses) {
                                        const existingCourseIds = acc[key].courses.map(c => c.id);
                                        const newCourses = p.courses.filter(c => !existingCourseIds.includes(c.id));
                                        acc[key].courses = [...acc[key].courses, ...newCourses];
                                    }
                                }
                                return acc;
                            }, {});
                            return uniqueEnrollments ? Object.values(uniqueEnrollments).map((payment, idx) => (
                                <div key={idx} className={idx > 0 ? "mt-4" : ""}>
                                    <div className="text-xs mt-3 pt-3 border-t border-slate-700">
                                        <span className="text-slate-500 block mb-0.5"><FaGraduationCap className="inline mr-1"/> Enrollment</span>
                                        <span className="text-blue-300 font-bold block">{payment.business?.name}</span>
                                        <span className="text-slate-400 block">{payment.batch?.name}</span>
                                    </div>
                                    <div className="text-xs mt-2">
                                        <span className="text-slate-500 block mb-0.5">Enrolled Subjects</span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {payment.courses?.map(c => (
                                                <span key={c.id} className="bg-slate-800 px-2 py-1 rounded text-[10px] text-slate-300 border border-slate-700">{c.name}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="text-xs mt-3">
                                        <span className="text-slate-500 block mb-0.5"><FaCreditCard className="inline mr-1"/> Payment Option</span>
                                        <span className="text-emerald-400 font-semibold">{getPaymentOption(payment)}</span>
                                    </div>
                                </div>
                            )) : null;
                        })()}
                    </div>

                    <div className="pt-4 mt-2 border-t border-slate-700 space-y-2">
                        <button onClick={handleGhostLogin} className="w-full bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-2 transition-all">
                            <FaUserSecret size={14}/> Ghost Login
                        </button>
                        <button onClick={() => setShowResetModal(true)} className="w-full bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-white border border-amber-500/30 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-2 transition-all">
                            <FaKey size={12}/> Reset Password
                        </button>
                    </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 text-amber-500 font-medium bg-[#3a2512]/30 p-3 rounded-lg border border-[#3a2512] text-xs leading-relaxed shadow-inner">
                  <FaTimesCircle className="shrink-0 text-base mt-0.5" /> 
                  Not registered in the main system yet.
                </div>
              )}
            </div>

            {/* 🔥 BATCH ALLOCATION UI 🔥 */}
            <div className="bg-[#1a2430] p-4 rounded-xl border border-white/5 shadow-sm mt-4">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Batch Allocation</h3>
              <p className="text-[10px] text-slate-400 mb-3 leading-relaxed">Allocate this lead to an active Free Seminar batch manually.</p>
              <select 
                value={selectedBatchId} 
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="w-full mb-3 p-2 text-xs bg-[#0f172a] border border-slate-700 text-slate-300 rounded-lg outline-none focus:border-emerald-700"
              >
                <option value="">Select Batch...</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <button 
                onClick={handleAllocateBatch} 
                disabled={allocating || !selectedBatchId}
                className="w-full bg-emerald-700/80 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-2 rounded-lg transition-colors shadow-md text-xs uppercase tracking-wider"
              >
                {allocating ? 'Allocating...' : 'Allocate to Batch'}
              </button>
            </div>

            {activeMode === 'CALL_CAMPAIGN' && (
              <div className="mt-4 bg-[#1e3a8a]/10 p-4 rounded-xl border border-blue-900/30 shadow-sm">
                 <h3 className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-4">Call Actions</h3>
                 <select className="w-full mb-3 p-2 text-sm bg-[#0f172a] border border-slate-700 text-slate-300 rounded-lg outline-none focus:border-blue-700">
                   <option>Select Call Method...</option>
                   <option value="direct">Direct Call</option>
                   <option value="whatsapp">WhatsApp Audio</option>
                   <option value="3cx">3CX</option>
                 </select>
                 <textarea 
                    className="w-full p-2 text-sm bg-[#0f172a] border border-slate-700 text-slate-300 rounded-lg outline-none focus:border-blue-700 mb-3 placeholder-slate-600" 
                    rows="3" 
                    placeholder="Enter feedback/remarks here..."
                 ></textarea>
                 <button className="w-full bg-blue-700 hover:bg-blue-600 text-slate-100 font-semibold py-2 rounded-lg transition-colors shadow-md text-sm">
                   Update Status
                 </button>
              </div>
            )}
          </div>
         </>
      )}

      {showResetModal && (
         <div className="absolute inset-0 z-50 bg-[#0f172a]/95 backdrop-blur-sm flex items-center justify-center p-4">
             <div className="bg-[#1e293b] border border-slate-700 rounded-2xl p-5 w-full shadow-2xl">
                 <div className="flex justify-between items-center mb-4">
                     <h3 className="text-sm font-bold text-amber-500 flex items-center gap-2"><FaKey/> Reset Password</h3>
                     <button onClick={()=>{setShowResetModal(false); setLastResetPassword(null); setNewPassword('');}} className="text-slate-500 hover:text-white"><FaTimes/></button>
                 </div>
                 {lastResetPassword ? (
                     <div className="animate-in zoom-in duration-300">
                         <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl text-center mb-4 shadow-inner">
                             <FaCheckCircle className="text-emerald-400 mx-auto mb-2" size={28} />
                             <p className="text-emerald-400 font-bold text-[10px] uppercase mb-1">Password Changed!</p>
                             <p className="text-white text-lg font-mono tracking-widest bg-black/40 py-2 rounded-lg border border-white/5 mt-2 shadow-inner select-all">{lastResetPassword}</p>
                         </div>
                         <button onClick={copyToClipboard} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-lg text-sm shadow-lg uppercase">
                             Copy Password & Close
                         </button>
                     </div>
                 ) : (
                     <form onSubmit={handleResetPassword}>
                         <input type="text" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="Enter new password" required className="w-full bg-[#0f172a] border border-slate-700 text-white rounded-lg p-3 mb-4 text-sm outline-none focus:border-amber-500" />
                         <button type="submit" className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 rounded-lg text-sm shadow-lg">Confirm Reset</button>
                     </form>
                 )}
             </div>
         </div>
      )}

      {/* 🔥 Ghost Login Floating Resizable Window 🔥 */}
      {ghostIframe && createPortal(
          <div className="fixed inset-0 z-[99999] pointer-events-none">
              <div 
                  className="absolute pointer-events-auto bg-white flex flex-col shadow-[0_10px_50px_rgba(0,0,0,0.5)] border border-slate-600 rounded-2xl overflow-hidden"
                  style={{
                      left: `${iframePos.x}px`,
                      top: `${iframePos.y}px`,
                      width: '900px',
                      height: '600px',
                      resize: 'both',
                      minWidth: '400px',
                      minHeight: '300px'
                  }}
              >
                  <div 
                      onMouseDown={handleDragStart}
                      className="w-full bg-[#1e293b] border-b border-slate-700 px-4 py-3 flex justify-between items-center z-10 shrink-0 cursor-move"
                  >
                      <div className="flex items-center gap-3 pointer-events-none">
                          <div className="p-1.5 bg-emerald-500/20 rounded-lg text-emerald-400">
                              <FaArrowsAlt size={16} />
                          </div>
                          <div>
                              <h3 className="text-white font-bold text-sm">Ghost Login Active</h3>
                              <p className="text-emerald-400 text-[9px] font-bold uppercase tracking-widest">Landscape Dashboard</p>
                          </div>
                      </div>
                      <button 
                          onMouseDown={(e) => e.stopPropagation()} 
                          onClick={closeGhostLogin} 
                          className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white px-3 py-1.5 rounded-lg font-bold transition-all text-xs uppercase tracking-widest"
                      >
                          <FaTimes size={12} /> Close
                      </button>
                  </div>
                  
                  <div className="flex-1 w-full bg-[#f8fafc]">
                      <iframe src={ghostIframe} className="w-full h-full border-none" title="Ghost Login View"></iframe>
                  </div>
              </div>
          </div>,
          document.body
      )}

    </div>
  );
}