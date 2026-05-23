import React, { useState, useEffect } from 'react';
import { FaWhatsapp, FaFilter, FaRobot, FaPowerOff } from 'react-icons/fa';
import axios from '../../api/axios';
import toast from 'react-hot-toast';

// CRM Folder Imports
import AfterSeminarContactSidebar from './CRM/AfterSeminarContactSidebar';
import AfterSeminarChatArea from './CRM/AfterSeminarChatArea';
import AfterSeminarRightPanel from './CRM/AfterSeminarRightPanel';

export default function AfterSeminarDashboard() {
  const [user, setUser] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  
  const [businesses, setBusinesses] = useState([]);
  const [batches, setBatches] = useState([]);
  
  const [selectedBusiness, setSelectedBusiness] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');

  const [isFollowUpOn, setIsFollowUpOn] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    let parsedUser = { role: 'SYSTEM_ADMIN' };

    if (storedUser) {
      try { parsedUser = JSON.parse(storedUser); setUser(parsedUser); } catch(e) {}
    } else setUser(parsedUser); 

    fetchBusinessesAndBatches();
  }, []);

  const fetchBusinessesAndBatches = async () => {
    try {
      const res = await axios.get('/admin/manager/batches-full');
      const allBatches = res.data || [];
      setBatches(allBatches);
      
      const uniqueBiz = [];
      const bizMap = new Map();
      allBatches.forEach(b => {
        if (b.business && !bizMap.has(b.business.id)) {
          bizMap.set(b.business.id, true);
          uniqueBiz.push(b.business);
        }
      });
      setBusinesses(uniqueBiz);
    } catch (err) { console.error("Error fetching batches:", err); }
  };

  const rawRole = user?.role || JSON.parse(localStorage.getItem('user'))?.role || '';
  const userRole = rawRole.toUpperCase().replace(/ /g, '_'); 
  
  const isAdmin = ['SYSTEM_ADMIN', 'DIRECTOR', 'SUPER'].includes(userRole);
  const isManager = ['SYSTEM_ADMIN', 'DIRECTOR', 'MANAGER', 'SUPER', 'ASS_MANAGER', 'ADMIN'].includes(userRole);

  const displayBatches = batches.filter(b => {
      if (isAdmin && !selectedBusiness) return true; 
      if (isAdmin && selectedBusiness) return String(b.businessId) === String(selectedBusiness);
      
      const uBizId = String(user?.businessId || selectedBusiness || '').trim();
      const uBizName = String(user?.businessType || '').toLowerCase().trim();
      
      if (uBizId === '' && uBizName === '') return true;
      
      const batchBizId = String(b.businessId).trim();
      const batchBizName = String(b.business?.name || '').toLowerCase().trim();
      
      if (uBizId !== '' && batchBizId === uBizId) return true;
      if (uBizName !== '' && batchBizName === uBizName) return true;
      if (uBizName !== '' && batchBizName.includes(uBizName)) return true;
      if (uBizName !== '' && uBizName.includes(batchBizName)) return true;

      return false;
  });

  let activeBusinessId = isAdmin ? selectedBusiness : '';
  if (!isAdmin && displayBatches.length > 0) {
      activeBusinessId = String(displayBatches[0].businessId);
  }

  const needsToSelectBusiness = isAdmin && !selectedBusiness;

  useEffect(() => {
    if(activeBusinessId) fetchFollowUpStatus(activeBusinessId);
    else setIsFollowUpOn(false);
  }, [activeBusinessId]);

  const fetchFollowUpStatus = async (bizId) => {
    try {
      const res = await axios.get(`/after-seminar-crm/followup-status?businessId=${bizId}`);
      setIsFollowUpOn(res.data.isOn);
    } catch (error) { console.error("Failed to load status"); }
  };

  const handleToggleFollowUp = async () => {
    if(!activeBusinessId) return toast.error("Please select a business first.");
    const newStatus = !isFollowUpOn;
    setIsFollowUpOn(newStatus);
    try {
      await axios.post('/after-seminar-crm/toggle-followup', { businessId: activeBusinessId, isOn: newStatus });
      if (newStatus) toast.success("Auto Follow-Up STARTED!", { icon: '🚀' });
      else toast.error("Auto Follow-Up STOPPED!", { icon: '🛑' });
    } catch (error) {
      setIsFollowUpOn(!newStatus); 
      toast.error("Failed to update");
    }
  };

  const handleRedirectToCampaign = (lead) => {
      let path = '/workspace/campaign/open-seminar';
      if (lead.source === 'bridge_transfer' && lead.enrollmentStatus !== 'ENROLLED') path = '/workspace/campaign/bridge-transfers';
      else if (lead.enrollmentStatus === 'ENROLLED') path = '/workspace/campaign/paid-students';
      else if (lead.inquiryType === 'NEW_INQ') path = '/workspace/campaign/new-inquiries';
      
      // 🔥 Phone number eka URL parameter ekak widiyata add karanawa
      if (lead.phone) {
          path += `?searchPhone=${encodeURIComponent(lead.phone)}`;
      }
      
      window.location.href = path; 
  };

  return (
    <div className="h-full flex flex-col gap-4 animate-fade-in-up text-slate-200 relative">
      
      <div className="flex flex-col xl:flex-row justify-between items-center gap-4 bg-white/5 backdrop-blur-lg p-3 rounded-2xl border border-white/10 shadow-xl shrink-0">
        <div className="flex items-center gap-3 text-lg font-black tracking-wide text-white uppercase px-2">
            <FaWhatsapp className="text-emerald-400" size={24} /> After Seminar CRM
        </div>

        <div className="flex items-center gap-3 w-full xl:w-auto overflow-x-auto">
          {isManager && (
            <button onClick={handleToggleFollowUp} disabled={needsToSelectBusiness} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all shadow-md border whitespace-nowrap ${isFollowUpOn ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 hover:bg-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/30'} ${needsToSelectBusiness ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {isFollowUpOn ? <FaRobot className="animate-pulse" /> : <FaPowerOff />}
              {isFollowUpOn ? 'FOLLOW-UP: ON' : 'FOLLOW-UP: OFF'}
            </button>
          )}

          <div className="w-px h-6 bg-white/10 mx-1 hidden xl:block"></div>

          <div className="flex items-center gap-3">
            <FaFilter className="text-slate-500 shrink-0" />
            {isAdmin && (
              <select value={selectedBusiness} onChange={(e) => { setSelectedBusiness(e.target.value); setSelectedBatch(''); }} className="bg-black/40 border border-white/10 text-slate-300 text-xs font-bold rounded-lg px-3 py-2 outline-none focus:border-brand-accent transition-all cursor-pointer">
                <option value="">Select Business</option>
                {businesses.map(biz => <option key={biz.id} value={biz.id} className="bg-slate-900">{biz.name}</option>)}
              </select>
            )}

            <select value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)} className="bg-black/40 border border-white/10 text-slate-300 text-xs font-bold rounded-lg px-3 py-2 outline-none focus:border-brand-accent transition-all cursor-pointer">
              <option value="">Select Batch (All)</option>
              {displayBatches.map(b => <option key={b.id} value={b.id} className="bg-slate-900">{b.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {needsToSelectBusiness ? (
        <div className="flex-1 bg-white/5 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center text-slate-500 shadow-xl border border-white/10 animate-fade-in-up">
          <FaFilter className="text-6xl text-slate-600 mb-4 opacity-20" />
          <h2 className="text-xl font-bold text-slate-400 tracking-tight">Select a Business to Start</h2>
        </div>
      ) : (
        <div className="flex-1 flex gap-4 h-[calc(100%-6rem)] overflow-hidden">
          <AfterSeminarContactSidebar 
            activeMode={'CRM'} 
            selectedLead={selectedLead} 
            setSelectedLead={setSelectedLead} 
            filters={{ selectedBusiness: activeBusinessId, selectedBatch }} 
            onRedirectToCampaign={handleRedirectToCampaign} 
          />
          {selectedLead ? (
            <>
              <AfterSeminarChatArea selectedLead={selectedLead} businessId={activeBusinessId} />
              <AfterSeminarRightPanel selectedLead={selectedLead} activeMode={'CRM'} />
            </>
          ) : (
            <div className="flex-1 bg-white/5 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center text-slate-400 shadow-xl border border-white/10">
              <FaWhatsapp className="text-6xl text-slate-600 mb-4 opacity-20" />
              <h2 className="text-xl font-bold text-slate-400 tracking-tight">Select a lead to start CRM chatting</h2>
            </div>
          )}
        </div>
      )}
    </div>
  );
}