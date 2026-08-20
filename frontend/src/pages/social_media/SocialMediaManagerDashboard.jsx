import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Activity, BarChart2, Video } from 'lucide-react';
import StaffManagement from '../../components/common/StaffManagement';
import SocialMediaTaskOverview from './components/SocialMediaTaskOverview';
import VideoEditor from './components/VideoEditor';

export default function SocialMediaManagerDashboard({ loggedInUser }) {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const tab = queryParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [location.search]);
  return (
    <div className="h-full flex flex-col animate-fade-in-up">
      {/* Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
        
        {activeTab === 'overview' && (
          <div className="h-full">
            <SocialMediaTaskOverview loggedInUser={loggedInUser} />
          </div>
        )}

        {activeTab === 'team' && (
          <div className="h-full">
            <StaffManagement loggedInUser={loggedInUser} />
          </div>
        )}

        {activeTab === 'analytics' && (
           <div className="bg-[#1e293b] p-8 rounded-2xl border border-white/5 shadow-md flex flex-col items-center justify-center min-h-[400px] text-center">
             <BarChart2 size={48} className="text-slate-600 mb-4" />
             <h2 className="text-xl font-bold text-white mb-2">Analytics Module</h2>
             <p className="text-slate-400 max-w-md">Connect Meta and Google Analytics APIs to view detailed insights.</p>
           </div>
        )}

      </div>
    </div>
  );
}
