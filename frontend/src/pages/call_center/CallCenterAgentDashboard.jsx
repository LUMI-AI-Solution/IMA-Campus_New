import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  PhoneCall, Loader, ChevronLeft, Calendar,
  PhoneForwarded, Megaphone, Target, PieChart, Activity, Repeat
} from 'lucide-react';
import toast from 'react-hot-toast';
import LeadCallCard from '../../components/CallCenter/LeadCallCard';

export default function CallCenterAgentDashboard() {
  const { tab } = useParams(); // 'overview', 'free-sem', 'after-sem'
  const navigate = useNavigate();
  
  // Views: 'buckets' (default for tab) | 'detail' (when a biz card is clicked)
  const [view, setView] = useState('buckets');
  
  // Overview Data (powers the business cards)
  const [overviewData, setOverviewData] = useState({ AFTER_SEMINAR: [], FREE_SEMINAR: [], BRIDGE: [] });
  const [loading, setLoading] = useState(true);

  // Detail View State
  const [selectedBiz, setSelectedBiz] = useState(null); // { id, name, campaignType }
  const [leads, setLeads] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  
  const [activeRound, setActiveRound] = useState(1);
  const [activePhase, setActivePhase] = useState(1);
  const [batchFilter, setBatchFilter] = useState('All');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    // If tab changes, reset to buckets view
    setView('buckets');
    setSelectedBiz(null);
  }, [tab]);

  useEffect(() => {
    fetchOverview();
  }, []);

  useEffect(() => {
    if (view === 'detail' && selectedBiz) {
      fetchBusinessLeads();
    }
  }, [view, selectedBiz]);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/call-center/agent-v2/overview', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOverviewData(response.data || { AFTER_SEMINAR: [], FREE_SEMINAR: [], BRIDGE: [] });
    } catch (error) {
      console.error("Overview fetch error", error);
      toast.error("Failed to load dashboard overview.");
    } finally {
      setLoading(false);
    }
  };

  const fetchBusinessLeads = async () => {
    setDetailLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/call-center/agent-v2/business-leads', {
        headers: { Authorization: `Bearer ${token}` },
        params: { 
          campaignType: selectedBiz.campaignType,
          businessId: selectedBiz.id
        }
      });
      setLeads(response.data || []);
      setCurrentPage(1); 
    } catch (error) {
      console.error("Leads fetch error", error);
      toast.error("Failed to load leads for this business.");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSaveLead = async (leadId, roundNum, data) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/call-center/agent-v2/update-progress', {
        leadId,
        roundNum,
        ...data
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Lead progress saved!");
      fetchBusinessLeads();
      fetchOverview(); // Refresh counts
    } catch (error) {
      console.error("Save lead error", error);
      toast.error("Failed to update lead.");
    }
  };

  const handleOpenChat = (lead) => {
    let phoneStr = lead.phone.replace(/[^0-9]/g, '');
    if (phoneStr.startsWith('0')) {
        phoneStr = '94' + phoneStr.substring(1);
    }
    const msg = `Hi ${lead.name || ''}, `;
    const encodedMsg = encodeURIComponent(msg);
    const url = `https://wa.me/${phoneStr}?text=${encodedMsg}`;
    window.open(url, '_blank');
  };

  // Helper to get active round data for a lead
  const getLeadRoundData = (l, round) => {
    if (round === 1) {
      return {
        phase: l.phase || 1,
        callStatus: l.callStatus || 'pending',
        callCenterStatus: l.callCenterStatus || 'pending',
        callMethod: l.callMethod || 'Direct Call',
        callAttempt: l.callAttempt || 1,
        feedback: l.feedback || ''
      };
    } else {
      const r2 = l.roundProgress?.find(rp => rp.roundNum === 2);
      if (!r2) return null; // Means this lead is not in Round 2
      return {
        phase: r2.phase || 1,
        callStatus: r2.callStatus || 'pending',
        callCenterStatus: r2.callStatus?.toUpperCase() === 'ANSWERED' || r2.callStatus?.toUpperCase() === 'REJECT' ? 'completed' : 'pending',
        callMethod: r2.callMethod || 'Direct Call',
        callAttempt: r2.callAttempt || 1,
        feedback: r2.feedback || l.feedback || '' // Carry over feedback if round 2 is empty
      };
    }
  };

  // Compute filtered leads
  const batchFilteredLeads = batchFilter === 'All' ? leads : leads.filter(l => l.batch?.id === parseInt(batchFilter));
  
  // Leads for the current round
  const roundLeads = batchFilteredLeads.map(l => {
    const rData = getLeadRoundData(l, activeRound);
    if (!rData) return null;
    return { ...l, roundData: rData };
  }).filter(Boolean); // Remove leads that don't have this round

  const phaseLeads = roundLeads.filter(l => l.roundData.phase === activePhase);
  const paginatedLeads = phaseLeads.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(phaseLeads.length / ITEMS_PER_PAGE);

  // Stats for the active round
  const totalAssigned = roundLeads.length;
  // For pending, we consider anything that is NOT answered or reject (or completed)
  const pending = roundLeads.filter(l => !['ANSWERED', 'REJECT', 'COMPLETED'].includes(l.roundData.callStatus?.toUpperCase())).length;
  const covered = totalAssigned - pending;
  const responseRate = totalAssigned > 0 
    ? ((roundLeads.filter(l => ['ANSWERED', 'REJECT'].includes(l.roundData.callStatus?.toUpperCase())).length / totalAssigned) * 100).toFixed(1)
    : 0;

  // Batches for the filter
  const uniqueBatches = [...new Set(leads.map(l => l.batch?.id).filter(Boolean))];
  
  const hasPendingInBatch = (bId) => {
    return leads.some(l => {
      if (l.batch?.id !== bId) return false;
      const rData = getLeadRoundData(l, activeRound);
      if (!rData) return false;
      return !['ANSWERED', 'REJECT', 'COMPLETED'].includes(rData.callStatus?.toUpperCase());
    });
  };

  const getImageUrl = (imageName) => {
    if (!imageName || imageName === 'default.png' || imageName === 'null') return null;
    const base = axios.defaults.baseURL ? axios.defaults.baseURL.replace('/api', '') : '';
    return `${base}/storage/icons/${imageName}`;
  };

  const renderBusinessCards = (items, campType) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {items.length === 0 ? (
        <div className="col-span-full py-10 bg-white/5 border border-white/5 rounded-3xl text-center text-slate-500 font-bold">
          No assignments available in this bucket.
        </div>
      ) : (
        items.map(item => (
          <div 
            key={item.business.id}
            onClick={() => {
              setSelectedBiz({ id: item.business.id, name: item.business.name, campaignType: campType });
              setView('detail');
            }}
            className="relative bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/50 rounded-3xl p-6 transition-all cursor-pointer group shadow-lg overflow-hidden"
          >
            {/* Pending Badge on Corner */}
            <div className="absolute top-0 right-0 bg-rose-500 text-white font-black text-xs px-3 py-1 rounded-bl-xl shadow-md">
              {item.pending} PENDING
            </div>
            
            <div className="flex justify-between items-start mb-4 mt-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-600/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform overflow-hidden">
                {item.business.logo ? (
                  <img src={getImageUrl(item.business.logo) || '/logo.png'} alt="logo" className="w-full h-full object-contain p-1" onError={(e) => { e.target.src = '/logo.png'; }} />
                ) : (
                  <Target size={24} />
                )}
              </div>
            </div>
            <h3 className="text-xl font-black text-slate-200 mb-2 truncate">{item.business.name}</h3>
            <div className="w-full bg-[#0F172A] rounded-full h-1.5 mb-2 overflow-hidden">
              <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${(item.completed / Math.max(item.totalAssigned, 1)) * 100}%` }}></div>
            </div>
            <div className="flex justify-between text-xs text-slate-400 font-bold">
              <span>{item.completed} Covered</span>
              <span>{item.totalAssigned} Total Assigned</span>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const currentTab = tab || 'overview';

  return (
    <div className="p-0 text-slate-100 bg-transparent min-h-screen">
      {view === 'buckets' && (
        <div className="fade-in">
          <div className="mb-8 border-b border-white/5 pb-6">
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-400 to-indigo-400 flex items-center gap-3 capitalize">
              {currentTab === 'overview' ? <PieChart className="text-emerald-400" /> : 
               currentTab === 'free-sem' ? <Megaphone className="text-blue-400" /> : 
               currentTab === 'bridge' ? <Repeat className="text-indigo-400" /> : 
               <Calendar className="text-purple-400" />} 
              {currentTab.replace('-', ' ')}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {currentTab === 'overview' ? "Global caller statistics" : "Select a business card to start dialing assigned leads."}
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader className="animate-spin text-emerald-500 text-4xl" />
            </div>
          ) : (
            <>
              {currentTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {/* Calculate Global Stats */}
                  {(() => {
                    const allItems = [...overviewData.FREE_SEMINAR, ...overviewData.AFTER_SEMINAR, ...(overviewData.BRIDGE || [])];
                    const tAssigned = allItems.reduce((acc, i) => acc + i.totalAssigned, 0);
                    const tPending = allItems.reduce((acc, i) => acc + i.pending, 0);
                    const tCovered = allItems.reduce((acc, i) => acc + i.completed, 0);
                    const tRate = tAssigned > 0 ? ((tCovered / tAssigned) * 100).toFixed(1) : 0;
                    return (
                      <>
                        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Assigned</span>
                          <div className="text-4xl font-black text-white mt-2">{tAssigned}</div>
                        </div>
                        <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-3xl">
                          <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Total Covered</span>
                          <div className="text-4xl font-black text-emerald-400 mt-2">{tCovered}</div>
                        </div>
                        <div className="bg-rose-500/10 border border-rose-500/20 p-6 rounded-3xl">
                          <span className="text-xs font-bold text-rose-400 uppercase tracking-widest">Total Pending</span>
                          <div className="text-4xl font-black text-rose-400 mt-2">{tPending}</div>
                        </div>
                        <div className="bg-blue-500/10 border border-blue-500/20 p-6 rounded-3xl">
                          <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Avg Response Rate</span>
                          <div className="text-4xl font-black text-blue-400 mt-2">{tRate}%</div>
                        </div>
                      </>
                    )
                  })()}
                </div>
              )}
              {currentTab === 'free-sem' && renderBusinessCards(overviewData.FREE_SEMINAR, 'FREE_SEMINAR')}
              {currentTab === 'after-sem' && renderBusinessCards(overviewData.AFTER_SEMINAR, 'AFTER_SEMINAR')}
              {currentTab === 'bridge' && renderBusinessCards(overviewData.BRIDGE || [], 'BRIDGE')}
            </>
          )}
        </div>
      )}

      {view === 'detail' && selectedBiz && (
        <div className="fade-in">
          {/* Header & Back */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <button 
              onClick={() => setView('buckets')}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl text-sm font-bold"
            >
              <ChevronLeft size={18} /> Back to {currentTab.replace('-', ' ')}
            </button>
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-xl backdrop-blur-md">
              <span className="text-xs font-bold text-slate-400">Campaign:</span>
              <span className="text-sm font-black text-emerald-400">{selectedBiz.campaignType.replace('_', ' ')}</span>
              <span className="text-slate-600">|</span>
              <span className="text-sm font-black text-white">{selectedBiz.name}</span>
            </div>
          </div>

          {/* Batch Filter & Rounds */}
          <div className="bg-white/5 border border-white/10 p-6 rounded-3xl mb-6 backdrop-blur-sm">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              
              {/* Rounds Buttons & Stats */}
              <div className="flex flex-col md:flex-row gap-6 items-center flex-1">
                {selectedBiz?.campaignType !== 'FREE_SEMINAR' && (
                  <div className="flex gap-2 bg-[#0F172A]/80 p-1.5 rounded-2xl">
                    <button 
                      onClick={() => { setActiveRound(1); setActivePhase(1); setCurrentPage(1); }}
                      className={`px-6 py-3 rounded-xl font-black uppercase tracking-wider transition-all ${activeRound === 1 ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/20' : 'text-slate-400 hover:text-white'}`}
                    >
                      Round 01
                    </button>
                    <button 
                      onClick={() => { setActiveRound(2); setActivePhase(1); setCurrentPage(1); }}
                      className={`px-6 py-3 rounded-xl font-black uppercase tracking-wider transition-all ${activeRound === 2 ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/20' : 'text-slate-400 hover:text-white'}`}
                    >
                      Round 02
                    </button>
                  </div>
                )}

                <div className="flex gap-6 items-center bg-[#0F172A]/50 p-4 px-8 rounded-3xl border border-white/5 shadow-inner">
                  <div className="text-slate-500 font-black uppercase tracking-[0.2em] text-xs mr-4">Round Stats</div>
                  <div className="flex flex-col items-center"><span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Assigned</span><span className="text-2xl font-black text-white">{totalAssigned}</span></div>
                  <div className="w-px h-10 bg-white/10 mx-2"></div>
                  <div className="flex flex-col items-center"><span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider mb-1">Pending</span><span className="text-2xl font-black text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]">{pending}</span></div>
                  <div className="w-px h-10 bg-white/10 mx-2"></div>
                  <div className="flex flex-col items-center"><span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider mb-1">Covered</span><span className="text-2xl font-black text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]">{covered}</span></div>
                  <div className="w-px h-10 bg-white/10 mx-2"></div>
                  <div className="flex flex-col items-center"><span className="text-[10px] text-blue-500 font-bold uppercase tracking-wider mb-1">Response</span><span className="text-2xl font-black text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]">{responseRate}%</span></div>
                </div>
              </div>

              {/* Batch Filter */}
              <div className="min-w-[250px]">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Filter by Batch</label>
                <div className="relative">
                  <select 
                    value={batchFilter}
                    onChange={(e) => setBatchFilter(e.target.value)}
                    className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-slate-200 outline-none focus:border-indigo-500 appearance-none"
                  >
                    <option value="All">All Batches</option>
                    {uniqueBatches.map(bId => {
                      const bName = leads.find(l => l.batch?.id === bId)?.batch?.name;
                      const hasPending = hasPendingInBatch(bId);
                      return <option key={bId} value={bId}>{bName} {hasPending ? '🔴 (Pending)' : ''}</option>;
                    })}
                  </select>
                </div>
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
              {detailLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader className="animate-spin text-emerald-500 text-4xl" />
                </div>
              ) : paginatedLeads.length === 0 ? (
                <div className="text-center py-20 bg-white/5 border border-white/10 rounded-3xl">
                  <PhoneCall className="text-slate-600 mx-auto mb-4" size={48} />
                  <h3 className="text-xl font-bold text-slate-400">No Leads Found</h3>
                  <p className="text-slate-500 mt-2">There are no leads in Phase {activePhase} for Round {activeRound}.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {paginatedLeads.map((lead, index) => (
                    <LeadCallCard 
                      key={lead.id} 
                      lead={lead} 
                      roundData={lead.roundData}
                      activeRound={activeRound}
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
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-50 text-slate-300 font-bold transition-all"
                  >
                    Previous
                  </button>
                  <span className="text-slate-400 font-bold text-sm">Page {currentPage} of {totalPages}</span>
                  <button 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-50 text-slate-300 font-bold transition-all"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
