import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ContactSidebar from '../../components/CoordinatorCRM/ContactSidebar';
import ChatArea from '../../components/CoordinatorCRM/ChatArea';
import RightSidePanel from '../../components/CoordinatorCRM/RightSidePanel';
import CallCampaignModule from '../../components/CoordinatorCRM/CallCampaignModule';
import CoordinatorOverview from '../../components/CoordinatorCRM/CoordinatorOverview';
import DedicatedCoordinatorOverview from '../../components/CoordinatorCRM/DedicatedCoordinatorOverview';
import { FaWhatsapp, FaHeadset, FaFilter, FaChartBar, FaRobot, FaPowerOff } from 'react-icons/fa';
import { LayoutDashboard } from 'lucide-react';
import axios from '../../api/axios';
import toast from 'react-hot-toast';

export default function CoordinatorDashboard() {
  const location = useLocation();
  const [user, setUser] = useState(null);
  
  const [activeMode, setActiveMode] = useState(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const modeParam = searchParams.get('mode');
    if (modeParam === 'CALL_CAMPAIGN') return 'CALL_CAMPAIGN';
    if (modeParam === 'STATS') return 'STATS';
    return window.location.pathname.includes('/workspace/crm') ? 'CRM' : 'OVERVIEW';
  });

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const modeParam = searchParams.get('mode');
    if (modeParam === 'CALL_CAMPAIGN') {
       setActiveMode('CALL_CAMPAIGN');
    } else if (modeParam === 'STATS') {
       setActiveMode('STATS');
    } else {
       const isCrmPath = location.pathname.includes('/workspace/crm');
       setActiveMode(isCrmPath ? 'CRM' : 'OVERVIEW');
    }
  }, [location.pathname, location.search]);

  const [selectedLead, setSelectedLead] = useState(null);
  
  const [businesses, setBusinesses] = useState([]);
  const [batches, setBatches] = useState([]);
  
  const [selectedBusiness, setSelectedBusiness] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');

  const [isFollowUpOn, setIsFollowUpOn] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try { setUser(JSON.parse(storedUser)); } catch(e) {}
    } else {
      setUser({ role: 'SYSTEM_ADMIN' }); 
    }
    fetchBusinessesAndBatches();
    fetchFollowUpStatus();
  }, []);

  const fetchBusinessesAndBatches = async () => {
    try {
      const res = await axios.get('/admin/manager/batches-full');
      const allBatches = res.data;
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
      
      // 🔥 FIX: Auto-select eka ain kala. Dan user ma business eka select karanna ona 🔥

    } catch (err) { console.error("Error fetching dropdown data:", err); }
  };

  const fetchFollowUpStatus = async () => {
    try {
      const res = await axios.get('/coordinator-crm/followup-status');
      setIsFollowUpOn(res.data.isOn);
    } catch (error) { console.error("Failed to load follow-up status"); }
  };

  const handleToggleFollowUp = async () => {
    const newStatus = !isFollowUpOn;
    setIsFollowUpOn(newStatus);
    try {
      await axios.post('/coordinator-crm/toggle-followup', { isOn: newStatus });
      if (newStatus) toast.success("Auto Follow-Up Engine STARTED!", { icon: '🚀' });
      else toast.error("Auto Follow-Up Engine STOPPED!", { icon: '🛑' });
    } catch (error) {
      setIsFollowUpOn(!newStatus); 
      toast.error("Failed to update status");
    }
  };

  const rawRole = user?.role || JSON.parse(localStorage.getItem('user'))?.role || '';
  const userRole = rawRole.toUpperCase().replace(/ /g, '_'); 
  const isAdmin = ['SYSTEM_ADMIN', 'DIRECTOR'].includes(userRole);
  const isManager = ['SYSTEM_ADMIN', 'DIRECTOR', 'MANAGER', 'SUPER', 'ASS_MANAGER'].includes(userRole);

  const displayBusinesses = React.useMemo(() => {
    if (isAdmin) return businesses;
    if (isManager) {
      return businesses.filter(biz => {
        const isManagerOf = biz.head_manager_id === user?.id || biz.ass_manager_id === user?.id;
        const matchesBizType = user?.businessType && (
          String(biz.id) === String(user.businessType).trim() ||
          biz.name.toLowerCase().trim() === String(user.businessType).toLowerCase().trim() ||
          biz.name.toLowerCase().includes(String(user.businessType).toLowerCase().trim()) ||
          String(user.businessType).toLowerCase().trim().includes(biz.name.toLowerCase().trim())
        );
        return isManagerOf || matchesBizType;
      });
    }
    return [];
  }, [businesses, isAdmin, isManager, user]);

  useEffect(() => {
    if (isManager && !isAdmin && displayBusinesses.length > 0 && !selectedBusiness) {
      setSelectedBusiness(String(displayBusinesses[0].id));
    }
  }, [displayBusinesses, isManager, isAdmin, selectedBusiness]);

  const displayBatches = selectedBusiness 
    ? batches.filter(b => b.businessId === parseInt(selectedBusiness))
    : batches;

  // 🔥 FIX: Business eka select nokara data penna bari wenna constraint ekak damma 🔥
  const needsToSelectBusiness = (isAdmin || isManager) && !selectedBusiness;

  const isCrm = activeMode === 'CRM';

  return (
    <div className="h-full flex flex-col gap-4 animate-fade-in-up text-slate-300">
      
      {!(activeMode === 'CALL_CAMPAIGN' && !isAdmin && !isManager) && (
        <div className="flex flex-col xl:flex-row justify-between items-center gap-4 bg-[#23303f] p-4 rounded-2xl shadow-lg border border-white/5">
        
        <div className="flex items-center gap-3 w-full xl:w-auto">
          <div className={`p-2.5 rounded-xl ${isCrm ? 'bg-emerald-500/10 text-emerald-400' : activeMode === 'STATS' ? 'bg-blue-500/10 text-blue-400' : 'bg-rose-500/10 text-rose-400'} border border-white/5`}>
            {isCrm ? <FaWhatsapp className="text-2xl" /> : <FaChartBar className="text-2xl" />}
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-wide">
              {isCrm ? 'Free Seminar CRM Workspace' : activeMode === 'STATS' ? 'Free Seminar Campaign Stats' : 'Class Coordinator Dashboard'}
            </h1>
            <p className="text-xs text-slate-400">
              {isCrm ? 'Manage and follow up with free seminar student leads' : activeMode === 'STATS' ? 'Real-time campaign statistics and performance' : 'Your personal operational stats and follow-up campaigns'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full xl:w-auto overflow-x-auto justify-end">
          
          {(isAdmin || isManager) && activeMode === 'CRM' && (
            <button 
              onClick={() => setActiveMode('OVERVIEW')}
              className="px-4 py-2 bg-[#0f172a] hover:bg-[#1e293b] text-white rounded-xl text-xs font-bold transition-all border border-white/5 flex items-center gap-2"
            >
              <LayoutDashboard size={16} className="text-blue-400" /> ADMIN DASHBOARD
            </button>
          )} {(isAdmin || isManager) && (
            <button 
              onClick={handleToggleFollowUp}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all shadow-md border whitespace-nowrap ${
                isFollowUpOn 
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 hover:bg-emerald-500/30' 
                  : 'bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/30'
              }`}
            >
              {isFollowUpOn ? <FaRobot className="animate-pulse" /> : <FaPowerOff />}
              {isFollowUpOn ? 'FOLLOW-UP: ON' : 'FOLLOW-UP: OFF'}
            </button>
          )}

          <div className="w-px h-6 bg-slate-600 mx-1 hidden xl:block"></div>

          {(isAdmin || isManager) && (
            <div className="flex items-center gap-3">
              <FaFilter className="text-slate-500 shrink-0" />
              {(isAdmin || (isManager && activeMode !== 'STATS' && displayBusinesses.length > 1)) && (
                <select 
                  value={selectedBusiness}
                  onChange={(e) => { setSelectedBusiness(e.target.value); setSelectedBatch(''); }}
                  className="bg-[#1a2430] border border-white/10 text-slate-300 text-sm rounded-lg px-3 py-2 outline-none focus:border-emerald-600"
                >
                  <option value="">Select Business</option>
                  {displayBusinesses.map(biz => <option key={biz.id} value={biz.id}>{biz.name}</option>)}
                </select>
              )}
              <select 
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="bg-[#1a2430] border border-white/10 text-slate-300 text-sm rounded-lg px-3 py-2 outline-none focus:border-emerald-600"
              >
                <option value="">Select Batch</option>
                {displayBatches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Main Content Area */}
      {needsToSelectBusiness ? (
        <div className="flex-1 bg-[#1a2430] rounded-2xl flex flex-col items-center justify-center text-slate-500 shadow-xl border border-white/5 animate-fade-in-up">
          <FaFilter className="text-6xl text-slate-600 mb-4 opacity-50" />
          <h2 className="text-xl font-semibold text-slate-300">Select a Business to Start</h2>
          <p className="text-sm mt-1">Please select a business from the top dropdown filter to load the data.</p>
        </div>
      ) : activeMode === 'OVERVIEW' ? (
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            {!isAdmin && !isManager ? (
               <DedicatedCoordinatorOverview selectedBusiness={selectedBusiness} selectedBatch={selectedBatch} />
            ) : (
               <CoordinatorOverview 
                 loggedInUser={user} 
                 setActiveMode={setActiveMode} 
                 selectedBusiness={selectedBusiness} 
                 selectedBatch={selectedBatch} 
               />
            )}
        </div>
      ) : activeMode === 'CRM' ? (
        <div className="flex-1 flex gap-4 h-[calc(100%-6rem)] overflow-hidden">
          <ContactSidebar 
            activeMode={activeMode} 
            selectedLead={selectedLead} 
            setSelectedLead={setSelectedLead}
            filters={{ selectedBusiness, selectedBatch }}
          />

          {selectedLead ? (
            <>
              <ChatArea selectedLead={selectedLead} />
              <RightSidePanel selectedLead={selectedLead} activeMode={activeMode} />
            </>
          ) : (
            <div className="flex-1 bg-[#23303f] rounded-2xl flex flex-col items-center justify-center text-slate-500 shadow-xl border border-white/5">
              <FaWhatsapp className="text-6xl text-slate-600 mb-4 opacity-50" />
              <h2 className="text-xl font-semibold text-slate-300">Select a lead to start</h2>
              <p className="text-sm mt-1">Choose a contact from the left panel</p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 bg-[#1a2430] rounded-2xl border border-white/5 overflow-hidden shadow-xl">
            <CallCampaignModule 
                loggedInUser={user} 
                filters={{ selectedBusiness, selectedBatch }} 
                setActiveMode={setActiveMode}
                setSelectedLead={setSelectedLead}
                forceStatsView={activeMode === 'STATS'}
            />
        </div>
      )}
    </div>
  );
}