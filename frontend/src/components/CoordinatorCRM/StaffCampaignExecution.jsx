import React, { useState, useEffect, useMemo } from 'react';
import axios from '../../api/axios';
import { PhoneCall, Loader, PieChart, Target, Calendar, PhoneForwarded, Megaphone, Activity, Repeat, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import LeadCallCard from '../CallCenter/LeadCallCard';
import ChatArea from './ChatArea';
import RightSidePanel from './RightSidePanel';
import { FaTimes } from 'react-icons/fa';

export default function StaffCampaignExecution({ filters }) {
  const currentUserId = JSON.parse(localStorage.getItem('user'))?.id;
  const rawRole = JSON.parse(localStorage.getItem('user'))?.role || '';
  
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [activePhase, setActivePhase] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const [chatModalLead, setChatModalLead] = useState(null);

  useEffect(() => {
    fetchAssignedLeads();
  }, [filters?.selectedBusiness, filters?.selectedBatch]);

  const fetchAssignedLeads = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const isManager = ['SYSTEM_ADMIN', 'DIRECTOR', 'MANAGER', 'SUPER', 'ASS_MANAGER'].includes(rawRole.toUpperCase().replace(/ /g, '_'));

      const res = await axios.get('/coordinator-crm/leads', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          tab: 'ASSIGNED',
          loggedUserId: currentUserId,
          loggedUserRole: rawRole,
          businessId: isManager ? (filters?.selectedBusiness || '') : '',
          batchId: isManager ? (filters?.selectedBatch || '') : ''
        }
      });
      
      const sortedLeads = (res.data.leads || []).sort((a, b) => a.id - b.id);
      setLeads(sortedLeads);
    } catch (error) {
      toast.error("Failed to load campaign leads");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLead = async (leadId, roundNum, data) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/coordinator-crm/leads/update-call', {
        leadId, 
        method: data.callMethod || 'Direct Call', 
        status: data.callOutcome === 'PENDING' ? 'pending' : data.callOutcome.toLowerCase(), 
        feedback: data.feedback,
        coordinationRound: data.attempts || 1
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success("Saved successfully!");
      
      setLeads(prev => prev.map(l => {
        if (l.id === leadId) {
          let newPhase = l.phase;
          const statusLower = data.callOutcome.toLowerCase();
          if (statusLower === 'no_answer') {
            if (l.phase === 1) newPhase = 2;
            else if (l.phase === 2) newPhase = 3;
          }
          return { 
            ...l, 
            callStatus: statusLower, 
            feedback: data.feedback, 
            phase: newPhase,
            callMethod: data.callMethod,
            callAttempt: data.attempts
          };
        }
        return l;
      }));
    } catch (error) {
      toast.error("Failed to save data.");
    }
  };

  const handleOpenChat = (lead) => {
    setChatModalLead(lead);
  };

  // Convert Coordinator lead data to the shape expected by LeadCallCard
  const mapLeadToRoundData = (l) => {
    return {
      phase: l.phase || 1,
      callStatus: l.callStatus || 'pending',
      callMethod: l.callMethod || 'Direct Call',
      callAttempt: l.callAttempt || l.coordinationRound || 1,
      feedback: l.feedback || ''
    };
  };

  const roundLeads = leads.map(l => ({ ...l, roundData: mapLeadToRoundData(l) }));
  
  const phaseLeads = roundLeads.filter(l => l.roundData.phase === activePhase);
  const paginatedLeads = phaseLeads.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(phaseLeads.length / ITEMS_PER_PAGE);

  // Stats
  const totalAssigned = roundLeads.length;
  const pending = roundLeads.filter(l => !['ANSWERED', 'REJECT', 'COMPLETED'].includes(l.roundData.callStatus?.toUpperCase())).length;
  const covered = totalAssigned - pending;
  const responseRate = totalAssigned > 0 
    ? ((roundLeads.filter(l => ['ANSWERED', 'REJECT'].includes(l.roundData.callStatus?.toUpperCase())).length / totalAssigned) * 100).toFixed(1)
    : 0;

  return (
    <div className="fade-in w-full h-full pb-10 custom-scrollbar overflow-y-auto">
      {/* Top Bar matching CallCenter detail view */}
      <div className="bg-white/5 border border-white/10 p-6 rounded-3xl mb-6 backdrop-blur-sm shadow-xl">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          
          <div className="flex flex-col md:flex-row gap-6 items-center flex-1">
            {/* Removed Round 01 / Round 02 toggles as Coordinators and Free Sem do not use Rounds */}
            <div className="flex gap-6 items-center bg-[#0F172A]/50 p-4 px-8 rounded-3xl border border-white/5 shadow-inner">
              <div className="text-slate-500 font-black uppercase tracking-[0.2em] text-xs mr-4">Campaign Stats</div>
              <div className="flex flex-col items-center"><span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Assigned</span><span className="text-2xl font-black text-white">{totalAssigned}</span></div>
              <div className="w-px h-10 bg-white/10 mx-2"></div>
              <div className="flex flex-col items-center"><span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider mb-1">Pending</span><span className="text-2xl font-black text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]">{pending}</span></div>
              <div className="w-px h-10 bg-white/10 mx-2"></div>
              <div className="flex flex-col items-center"><span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider mb-1">Covered</span><span className="text-2xl font-black text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]">{covered}</span></div>
              <div className="w-px h-10 bg-white/10 mx-2"></div>
              <div className="flex flex-col items-center"><span className="text-[10px] text-blue-500 font-bold uppercase tracking-wider mb-1">Response</span><span className="text-2xl font-black text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]">{responseRate}%</span></div>
            </div>
          </div>

          <div className="hidden lg:block text-right">
            <span className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Campaign Mode</span>
            <span className="px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl font-black text-sm inline-block shadow-[0_0_15px_rgba(16,185,129,0.2)]">FREE SEMINAR</span>
          </div>

        </div>
      </div>

      <div className="flex gap-6">
        {/* Left Sidebar for Phases */}
        <div className="w-24 shrink-0 flex flex-col gap-3">
          {[1, 2, 3].map(ph => {
            const phCount = roundLeads.filter(l => l.roundData.phase === ph).length;
            return (
              <button
                key={ph}
                onClick={() => { setActivePhase(ph); setCurrentPage(1); }}
                className={`flex flex-col items-center justify-center py-4 rounded-2xl transition-all relative overflow-hidden ${
                  activePhase === ph 
                    ? 'bg-gradient-to-b from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/20' 
                    : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10'
                }`}
              >
                <span className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">Phase</span>
                <span className="text-2xl font-black">0{ph}</span>
                {phCount > 0 && (
                  <span className="mt-2 bg-black/30 px-2 py-0.5 rounded-full text-[10px] font-bold">{phCount} leads</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Main Leads Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader className="animate-spin text-emerald-500 text-4xl" />
            </div>
          ) : paginatedLeads.length === 0 ? (
            <div className="text-center py-20 bg-white/5 border border-white/10 rounded-3xl shadow-xl">
              <PhoneCall className="text-slate-600 mx-auto mb-4" size={48} />
              <h3 className="text-xl font-bold text-slate-400">No Leads Found</h3>
              <p className="text-slate-500 mt-2">There are no leads in Phase {activePhase} for your current filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {paginatedLeads.map((lead, index) => (
                <LeadCallCard 
                  key={lead.id} 
                  lead={lead} 
                  roundData={lead.roundData}
                  activeRound={1}
                  index={(currentPage - 1) * ITEMS_PER_PAGE + index} 
                  onSave={handleSaveLead}
                  onOpenChat={handleOpenChat}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-50 text-slate-300 font-bold transition-all shadow-md"
              >
                Previous
              </button>
              <span className="text-slate-400 font-bold text-sm bg-[#0F172A] px-4 py-2 rounded-xl border border-white/5 shadow-inner">Page {currentPage} of {totalPages}</span>
              <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-50 text-slate-300 font-bold transition-all shadow-md"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* POPUP CHAT MODAL */}
      {chatModalLead && (
        <div className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-sm flex justify-center items-center p-2 md:p-6 animate-fade-in">
          <div className="w-full max-w-7xl h-[95vh] md:h-[90vh] bg-[#0f172a] rounded-3xl flex flex-col border border-slate-700 shadow-2xl overflow-hidden relative">
            
            <div className="bg-gradient-to-r from-[#1e293b] to-[#0f172a] p-4 flex justify-between items-center border-b border-slate-700 shrink-0">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]"></span>
                <h3 className="text-white font-black text-sm md:text-base tracking-wide flex items-center gap-2">
                  Live CRM Chat <span className="text-blue-400 border-l border-slate-600 pl-2 ml-1">{chatModalLead.phone}</span>
                </h3>
              </div>
              <button onClick={() => {
                setChatModalLead(null);
                fetchAssignedLeads(); 
              }} className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white px-4 py-2 rounded-xl transition-all flex items-center gap-2 text-[10px] md:text-xs font-black uppercase tracking-widest border border-red-500/20 hover:shadow-[0_0_15px_rgba(239,68,68,0.4)]">
                <FaTimes /> Close Workspace
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden relative">
              <ChatArea selectedLead={chatModalLead} />
              <div className="hidden lg:block h-full shrink-0 border-l border-slate-800">
                <RightSidePanel selectedLead={chatModalLead} activeMode="CALL_CAMPAIGN" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
