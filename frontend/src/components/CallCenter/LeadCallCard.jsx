import React, { useState } from 'react';
import { MessageCircle, Bell, Check, Phone, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LeadCallCard({ lead, roundData, activeRound, index, onSave, onOpenChat }) {
  // Use roundData if available (passed from dashboard), else fallback to lead base fields
  const data = roundData || lead;
  
  const [callMethod, setCallMethod] = useState(data.callMethod || 'Direct Call');
  const [attempts, setAttempts] = useState(data.callAttempt || 1);
  const [remarks, setRemarks] = useState(data.feedback || '');
  
  // Set call outcome to what's in DB or PENDING
  const initialOutcome = ['ANSWERED', 'REJECT', 'NO_ANSWER'].includes(data.callStatus?.toUpperCase()) 
    ? data.callStatus.toUpperCase() 
    : 'PENDING';
    
  const [callOutcome, setCallOutcome] = useState(initialOutcome);

  const handleSave = () => {
    if (callOutcome === 'PENDING') {
      toast.error('Please select a Call Outcome (e.g. No Answer, Answered) before saving.');
      return;
    }
    onSave(lead.id, activeRound, {
      callMethod,
      attempts,
      feedback: remarks,
      callOutcome
    });
  };

  return (
    <div className="bg-[#1e1b4b]/80 backdrop-blur-md rounded-2xl border border-indigo-500/20 p-5 shadow-xl mb-2 hover:border-indigo-400/50 transition-all group">
      {/* Top Section */}
      <div className="flex justify-between items-start mb-4 pb-4 border-b border-indigo-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-black shadow-inner">
            {index + 1}
          </div>
          <div>
            <h3 className="text-xl font-black text-white leading-tight tracking-wide">{lead.phone?.split('_')[0]}</h3>
            <p className="text-slate-400 text-sm font-medium">~ {lead.name || 'Unknown'}</p>
          </div>
        </div>
        
        {/* Call Method Display */}
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Method</span>
          <select 
            value={callMethod}
            onChange={(e) => setCallMethod(e.target.value)}
            className="bg-[#312e81]/50 border border-indigo-500/30 rounded-lg px-2 py-1 text-xs font-bold text-indigo-200 outline-none focus:border-indigo-400 appearance-none text-right"
          >
            <option value="Direct Call" className="bg-[#0f172a] text-indigo-200">Direct Call</option>
            <option value="WhatsApp" className="bg-[#0f172a] text-indigo-200">WhatsApp</option>
            <option value="3CX" className="bg-[#0f172a] text-indigo-200">3CX</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 mb-5">
        <div className="col-span-8">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Outcome</label>
          <div className="relative">
            <select 
              value={callOutcome}
              onChange={(e) => setCallOutcome(e.target.value)}
              className={`w-full bg-[#312e81]/30 border rounded-xl px-3 py-2.5 text-sm font-bold outline-none appearance-none transition-colors
                ${callOutcome === 'PENDING' ? 'border-amber-500/30 text-amber-400 focus:border-amber-500/60' : 
                  callOutcome === 'ANSWERED' ? 'border-emerald-500/30 text-emerald-400 focus:border-emerald-500/60' : 
                  callOutcome === 'NO_ANSWER' ? 'border-blue-500/30 text-blue-400 focus:border-blue-500/60' : 
                  'border-rose-500/30 text-rose-400 focus:border-rose-500/60'}`}
            >
              <option value="PENDING">⌛ PENDING</option>
              <option value="ANSWERED">✅ ANSWERED</option>
              <option value="NO_ANSWER">🔇 NO ANSWER</option>
              <option value="REJECT">❌ REJECT</option>
            </select>
          </div>
        </div>
        <div className="col-span-4">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Att.</label>
          <select 
            value={attempts}
            onChange={(e) => setAttempts(Number(e.target.value))}
            className="w-full bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2.5 text-sm font-black text-rose-400 outline-none focus:border-rose-500 appearance-none text-center"
          >
            {[1,2,3,4,5].map(n => <option key={n} value={n} className="bg-[#0f172a] text-rose-400 font-bold">{n}</option>)}
          </select>
        </div>
      </div>

      <div className="mb-5">
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Remarks</label>
        <textarea 
          rows="2"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Add your notes..."
          className="w-full bg-[#312e81]/30 border border-indigo-500/20 rounded-xl px-3 py-2 text-sm text-slate-300 outline-none focus:border-indigo-500 resize-none placeholder-indigo-300/30 transition-colors"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button 
          onClick={handleSave}
          className="w-full bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-black rounded-xl py-3 flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(225,29,72,0.3)] hover:shadow-[0_0_25px_rgba(225,29,72,0.5)] transform hover:-translate-y-0.5"
        >
          <Check size={18} strokeWidth={3} /> SAVE PROGRESS
        </button>
      </div>
    </div>
  );
}
