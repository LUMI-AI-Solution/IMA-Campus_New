import React from 'react';
import { Users, BookOpen, Clock, Activity, Building, MapPin } from 'lucide-react';

export default function OverviewTab() {
  
  const stats = [
    { title: 'Total Walk-ins Today', value: '124', icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { title: 'Active Physical Classes', value: '18', icon: BookOpen, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { title: 'Pending Inquiries', value: '45', icon: Clock, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { title: 'Overall Attendance', value: '89%', icon: Activity, color: 'text-purple-400', bg: 'bg-purple-500/10' }
  ];

  return (
    <div className="animate-fade-in w-full h-full">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-brand-accent/20 p-3 rounded-xl border border-brand-accent/30 shadow-[0_0_15px_rgba(225,29,72,0.3)]">
           <Building className="text-brand-accent" size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-white">Physical CRM Overview</h2>
          <p className="text-gray-400 text-sm">Real-time statistics for all physical branches and walk-ins.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((s, idx) => (
          <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md shadow-lg hover:bg-white/10 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${s.bg} border border-white/5`}>
                <s.icon size={20} className={s.color} />
              </div>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Today</span>
            </div>
            <h3 className="text-gray-400 text-sm font-medium mb-1">{s.title}</h3>
            <p className="text-3xl font-black text-white group-hover:scale-105 transition-transform origin-left drop-shadow-md">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Branch Activity Section */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md shadow-lg">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <MapPin className="text-rose-400" size={18} /> Branch Activity
        </h3>
        
        <div className="space-y-4">
            <div className="bg-black/20 rounded-xl p-4 border border-white/5 flex items-center justify-between hover:bg-black/30 transition-all cursor-pointer">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md">
                        CM
                    </div>
                    <div>
                        <h4 className="text-white font-bold">Colombo Main Branch</h4>
                        <p className="text-xs text-gray-400">8 Active Classes • 45 Walk-ins</p>
                    </div>
                </div>
                <div className="text-right">
                    <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border border-emerald-500/30">Active</span>
                </div>
            </div>

            <div className="bg-black/20 rounded-xl p-4 border border-white/5 flex items-center justify-between hover:bg-black/30 transition-all cursor-pointer">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500 to-orange-600 flex items-center justify-center text-white font-bold shadow-md">
                        GL
                    </div>
                    <div>
                        <h4 className="text-white font-bold">Galle Branch</h4>
                        <p className="text-xs text-gray-400">5 Active Classes • 22 Walk-ins</p>
                    </div>
                </div>
                <div className="text-right">
                    <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border border-emerald-500/30">Active</span>
                </div>
            </div>

             <div className="bg-black/20 rounded-xl p-4 border border-white/5 flex items-center justify-between hover:bg-black/30 transition-all cursor-pointer">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold shadow-md">
                        KD
                    </div>
                    <div>
                        <h4 className="text-white font-bold">Kandy Branch</h4>
                        <p className="text-xs text-gray-400">12 Active Classes • 57 Walk-ins</p>
                    </div>
                </div>
                <div className="text-right">
                    <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border border-emerald-500/30">Active</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
