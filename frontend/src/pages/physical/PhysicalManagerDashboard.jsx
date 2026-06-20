import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import StaffManagement from '../../components/common/StaffManagement';
import { Users, LayoutDashboard } from 'lucide-react';
import OverviewTab from './OverviewTab';

export default function PhysicalManagerDashboard({ loggedInUser }) {
  const { tab } = useParams();
  const navigate = useNavigate();
  const activeTab = tab || 'overview';

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'staff', label: 'Staff Management', icon: Users }
  ];

  return (
    <div className="h-full w-full flex flex-col p-6 animate-fade-in">
      
      {/* Header */}
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight drop-shadow-md">Physical CRM Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Manage physical classes, attendance, and branch operations</p>
        </div>
      </div>

      {/* Modern Glass Tabs */}
      <div className="flex gap-2 mb-6 bg-white/5 p-1 rounded-xl w-fit border border-white/10 backdrop-blur-md shadow-sm">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => navigate(`/physical/dashboard/${t.id}`)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all outline-none ${
              activeTab === t.id 
                ? 'bg-brand-accent/90 text-white shadow-[0_4px_15px_rgba(225,29,72,0.4)] border border-transparent' 
                : 'text-gray-400 hover:text-white hover:bg-white/10 border border-transparent'
            }`}
          >
            <t.icon size={16} className={activeTab === t.id ? 'text-white' : 'text-gray-500'} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl shadow-2xl overflow-hidden p-6 relative">
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'staff' && <StaffManagement loggedInUser={loggedInUser} />}
      </div>
      
    </div>
  );
}
