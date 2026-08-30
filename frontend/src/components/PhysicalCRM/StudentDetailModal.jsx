import React, { useState, useEffect } from 'react';
import { physicalCrmService } from '../../api/physicalCrm';
import { X, User, Calendar, CreditCard, MessageSquare, GraduationCap, Phone, MapPin, Building, ShieldCheck, CheckCircle2, Clock, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

export default function StudentDetailModal({ studentId, isOpen, onClose }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'payments' | 'attendance' | 'sms'

  useEffect(() => {
    if (isOpen && studentId) {
      fetchStudentDetails();
    }
  }, [isOpen, studentId]);

  const fetchStudentDetails = async () => {
    setLoading(true);
    try {
      const res = await physicalCrmService.getStudentFullDetails(studentId);
      if (res && res.success) {
        setData(res);
      }
    } catch (err) {
      toast.error('Failed to load student details');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const student = data?.student;
  const smsLogs = data?.smsLogs || [];

  const studentDisplayName = student ? (student.studentName || `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Student') : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl bg-gradient-to-b from-slate-900 via-slate-900 to-[#0b1120] border border-white/15 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white font-black text-xl shadow-lg border border-white/20">
              {studentDisplayName.slice(0, 2).toUpperCase() || 'ST'}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-black text-white tracking-wide">{studentDisplayName}</h2>
                <span className="text-xs bg-indigo-500/20 text-indigo-300 font-mono font-bold px-2.5 py-0.5 rounded-full border border-indigo-400/30">
                  {student?.studentId}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                <span>School: <strong className="text-slate-200">{student?.school?.name || 'N/A'}</strong></span>
                <span>•</span>
                <span>RFID: <strong className="text-slate-200 font-mono">{student?.rfid || 'Unassigned'}</strong></span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-white/5 bg-black/20">
          {[
            { id: 'overview', label: 'Student Profile', icon: User },
            { id: 'payments', label: `Fee Payments (${student?.feePayments?.length || 0})`, icon: CreditCard },
            { id: 'attendance', label: `Attendance History (${student?.attendances?.length || 0})`, icon: Calendar },
            { id: 'sms', label: `SMS Logs (${smsLogs.length})`, icon: MessageSquare }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                  isActive
                    ? 'border-indigo-400 text-white bg-indigo-500/10 rounded-t-xl'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center p-20 text-slate-400 gap-3">
              <Loader2 className="animate-spin text-indigo-400" size={24} />
              <span className="text-sm font-semibold">Loading Full Student Details...</span>
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Contact & Bio Info Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-black/30 border border-white/10 p-4 rounded-2xl">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Student Phone</span>
                      <p className="text-sm font-bold text-white font-mono">{student?.phone || 'No Phone'}</p>
                      {student?.whatsapp && <p className="text-[11px] text-emerald-400 mt-1 font-mono">WA: {student.whatsapp}</p>}
                    </div>

                    <div className="bg-black/30 border border-white/10 p-4 rounded-2xl">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Guardian Contact</span>
                      <p className="text-sm font-bold text-white">{student?.guardianName || 'Guardian'}</p>
                      <p className="text-xs text-amber-400 font-mono mt-0.5">{student?.guardianPhone || 'No Guardian Phone'}</p>
                    </div>

                    <div className="bg-black/30 border border-white/10 p-4 rounded-2xl">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Registration Fee</span>
                      <span className={`inline-block text-xs font-black px-3 py-1 rounded-full border ${
                        student?.registrationFeeStatus === 'PAID'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                          : 'bg-amber-500/20 text-amber-300 border-amber-400/30'
                      }`}>
                        {student?.registrationFeeStatus === 'PAID' ? 'PAID' : 'PENDING'}
                      </span>
                    </div>
                  </div>

                  {/* Enrolled Classes List */}
                  <div>
                    <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <GraduationCap size={15} className="text-indigo-400" /> Enrolled Physical Classes
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        ...(student?.class ? [student.class] : []),
                        ...(student?.enrollments || []).map(e => e.class).filter(Boolean)
                      ].filter((c, idx, arr) => arr.findIndex(x => x.id === c.id) === idx).map(cls => (
                        <div key={cls.id} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-black text-white">{cls.name}</h4>
                            <p className="text-xs text-slate-400">{cls.grade} • {cls.subject || 'All Subjects'}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-black text-emerald-400">Rs. {cls.monthlyFee || 0}</span>
                            <span className="block text-[10px] text-slate-500">Monthly Fee</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PAYMENTS */}
              {activeTab === 'payments' && (
                <div className="space-y-4">
                  {student?.feePayments?.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 text-sm">No payment records found for this student.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-white/10 text-slate-400 font-bold uppercase tracking-wider">
                            <th className="py-3 px-3">Month</th>
                            <th className="py-3 px-3">Class</th>
                            <th className="py-3 px-3">Amount</th>
                            <th className="py-3 px-3">Status</th>
                            <th className="py-3 px-3">Paid Date</th>
                            <th className="py-3 px-3">Method</th>
                            <th className="py-3 px-3">Remark</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-slate-200 font-medium">
                          {student?.feePayments?.map(p => (
                            <tr key={p.id} className="hover:bg-white/5 transition-colors">
                              <td className="py-3 px-3 font-bold text-white font-mono">{p.month}</td>
                              <td className="py-3 px-3 font-semibold text-indigo-300">{p.class?.name || 'Class'}</td>
                              <td className="py-3 px-3 font-black text-emerald-400">Rs. {p.amount}</td>
                              <td className="py-3 px-3">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                  p.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' :
                                  p.status === 'FREE_CARD' ? 'bg-blue-500/20 text-blue-300 border-blue-400/30' :
                                  'bg-amber-500/20 text-amber-300 border-amber-400/30'
                                }`}>
                                  {p.status}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-slate-400">{new Date(p.paidDate).toLocaleDateString('en-CA')}</td>
                              <td className="py-3 px-3 text-slate-300 font-mono text-[11px]">{p.paymentMethod || 'CASH'}</td>
                              <td className="py-3 px-3 text-slate-400 truncate max-w-[150px]">{p.remark || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: ATTENDANCE */}
              {activeTab === 'attendance' && (
                <div className="space-y-4">
                  {student?.attendances?.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 text-sm">No attendance records found for this student.</div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {student?.attendances?.map(att => (
                        <div key={att.id} className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 size={14} className="text-emerald-400" />
                            <span className="text-xs font-bold text-white font-mono">{new Date(att.date).toLocaleDateString('en-CA')}</span>
                          </div>
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
                            {att.status || 'PRESENT'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: SMS LOGS */}
              {activeTab === 'sms' && (
                <div className="space-y-3">
                  {smsLogs.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 text-sm">No SMS messages sent to this student yet.</div>
                  ) : (
                    smsLogs.map(log => (
                      <div key={log.id} className="p-4 bg-black/30 border border-white/10 rounded-2xl space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                              log.status === 'SENT'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                                : 'bg-rose-500/20 text-rose-300 border-rose-400/30'
                            }`}>
                              {log.status}
                            </span>
                            <span className="text-xs font-bold text-white font-mono">{log.phone}</span>
                          </div>
                          <span className="text-[11px] text-slate-500">{new Date(log.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-slate-300 bg-white/5 p-2.5 rounded-xl border border-white/5 font-sans leading-relaxed">
                          {log.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-black/30 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
