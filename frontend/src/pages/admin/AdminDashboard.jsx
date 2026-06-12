import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Database, AlertTriangle, Activity, CheckCircle2, Terminal, HardDrive, Cpu, Server } from 'lucide-react';
import { AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, CartesianGrid, YAxis } from 'recharts';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState("");
  const terminalEndRef = useRef(null);

  // Mock History Data for Charts since backend doesn't save historical CPU stats yet
  const cpuHistory = [
    { time: '10:00', load: 12 }, { time: '10:05', load: 18 }, { time: '10:10', load: 45 },
    { time: '10:15', load: 30 }, { time: '10:20', load: 25 }, { time: '10:25', load: 60 },
    { time: '10:30', load: 15 }
  ];

  const storageData = [
    { name: 'Database Data', value: 450 },
    { name: 'File Uploads', value: 850 },
    { name: 'Automated Backups', value: 1200 },
    { name: 'Free Space', value: 3500 }
  ];

  const apiTrafficData = [
    { name: 'Students', reqs: 14500 },
    { name: 'CRM (Team)', reqs: 8200 },
    { name: 'Payments', reqs: 3100 },
    { name: 'Webhooks', reqs: 1500 }
  ];

  const STORAGE_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#1E293B'];

  // Fetch Stats
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await api.get('/admin/overview'); 
        setStats(response.data);
      } catch (error) {
        console.warn("API Error", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Live Logs
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await api.get('/admin/logs');
        setLogs(response.data);
        if (terminalEndRef.current) {
          terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      } catch (error) {
        setLogs("Error connecting to server terminal...");
      }
    };
    fetchLogs();
    const logInterval = setInterval(fetchLogs, 3000);
    return () => clearInterval(logInterval);
  }, []);

  const handleDownloadBackup = async () => {
    setIsBackingUp(true);
    const toastId = toast.loading("Fetching latest Auto Backup...");
    try {
      const response = await api.get('/admin/backup', {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      link.setAttribute('download', `IMA_Backup_${dateStr}.sql`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success("Backup Downloaded!", { id: toastId });
    } catch (error) {
      toast.error("No backup found!", { id: toastId });
    } finally {
      setIsBackingUp(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center min-h-[60vh]">
        <Loader2 size={40} className="animate-spin text-brand-accent" />
      </div>
    );
  }

  return (
    <div className="w-full animate-fade-in pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">System Monitor</h2>
          <p className="text-sm font-medium text-emerald-400 mt-1 flex items-center gap-2">
             <Activity size={14} className="animate-pulse" /> Live Server Synchronization Active
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={handleDownloadBackup} 
            disabled={isBackingUp}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400 px-5 py-2.5 rounded-lg text-sm font-bold shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all"
          >
            {isBackingUp ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />} 
            {isBackingUp ? 'Fetching Backup...' : 'Download Latest DB'}
          </button>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard 
          title="Total Data Processed" 
          value={stats?.verifiedSales || 0} 
          icon={<CheckCircle2 size={20} className="text-emerald-400" />} 
          trend="Database Records" trendColor="text-emerald-400"
        />
        <StatCard 
          title="Current CPU Load" 
          value={`${stats?.serverHealth?.cpuUsage || 0}%`} 
          icon={<Cpu size={20} className="text-blue-400" />} 
          trend="All Node.js Cores" trendColor="text-blue-400"
        />
        <StatCard 
          title="Memory (RAM)" 
          value={`${stats?.serverHealth?.ramUsage || 0}%`} 
          icon={<HardDrive size={20} className="text-amber-400" />} 
          trend="Active Heap Usage" trendColor="text-amber-400"
        />
        <StatCard 
          title="System Alerts" 
          value={stats?.failed || 0} 
          icon={<AlertTriangle size={20} className="text-rose-400" />} 
          trend="Critical Errors" trendColor={stats?.failed > 0 ? "text-rose-400" : "text-emerald-400"}
        />
      </div>

      {/* Layout Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        
        {/* Left Side: Charts */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          
          {/* Server Load Area Chart */}
          <div className="bg-black/40 border border-white/5 backdrop-blur-xl p-6 rounded-2xl shadow-lg">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-extrabold text-gray-300 tracking-wider uppercase flex items-center gap-2">
                    <Server size={16} className="text-blue-400" /> CPU Load History (30 Min)
                </h3>
                <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-1 rounded-md font-bold">LIVE</span>
            </div>
            <div className="w-full relative">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={cpuHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="time" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.9)', border: '1px solid #333', borderRadius: '8px' }} 
                  />
                  <Area type="monotone" dataKey="load" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorLoad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Storage Distribution Pie Chart */}
              <div className="bg-black/40 border border-white/5 backdrop-blur-xl p-6 rounded-2xl shadow-lg flex flex-col items-center">
                <h3 className="text-xs font-extrabold text-gray-300 tracking-wider mb-2 w-full uppercase flex items-center gap-2">
                    <HardDrive size={16} className="text-emerald-400" /> Server Storage Dist. (MB)
                </h3>
                <div className="w-full relative mt-4">
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={storageData} innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                        {storageData.map((entry, index) => <Cell key={`cell-${index}`} fill={STORAGE_COLORS[index % STORAGE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(0,0,0,0.9)', border: '1px solid #333', borderRadius: '8px', color: '#fff' }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* API Traffic Bar Chart */}
              <div className="bg-black/40 border border-white/5 backdrop-blur-xl p-6 rounded-2xl shadow-lg">
                <h3 className="text-xs font-extrabold text-gray-300 tracking-wider mb-6 uppercase flex items-center gap-2">
                    <Activity size={16} className="text-purple-400" /> API Traffic by Module
                </h3>
                <div className="w-full relative">
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={apiTrafficData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip 
                        cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} 
                        contentStyle={{ backgroundColor: 'rgba(0,0,0,0.9)', border: '1px solid #333', borderRadius: '8px', color: '#fff' }} 
                      />
                      <Bar dataKey="reqs" fill="#8B5CF6" radius={[4, 4, 0, 0]} maxBarSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
          </div>
        </div>

        {/* Right Side: Hacker Terminal */}
        <div className="xl:col-span-1 bg-black border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)]">
          <div className="bg-[#1e1e1e] px-4 py-3 flex items-center gap-2 border-b border-white/5">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-rose-500"></div>
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            </div>
            <p className="text-[10px] text-gray-400 ml-2 font-mono flex items-center gap-2">
              <Terminal size={12} /> root@imacampus-server: ~/live-logs
            </p>
          </div>
          
          <div className="flex-1 p-5 bg-[#0a0a0a] font-mono text-[10px] sm:text-[11px] text-emerald-400 overflow-y-auto max-h-[500px]">
            <div className="mb-4 text-emerald-500/70 border-b border-emerald-900/30 pb-2">
                # INITIALIZING SECURE SHELL INTERFACE...<br/>
                # STREAMING LIVE BACKEND LOGS FROM PM2 PROCESS...<br/>
                # ENCRYPTED CONNECTION ESTABLISHED.
            </div>
            <pre className="whitespace-pre-wrap break-words leading-relaxed">
              {logs || "Waiting for server connection..."}
            </pre>
            <div className="inline-block w-2.5 h-4 bg-emerald-400 animate-pulse ml-1 align-middle mt-2"></div>
            <div ref={terminalEndRef} />
          </div>
        </div>

      </div>

    </div>
  );
}

function StatCard({ title, value, icon, trend, trendColor }) {
  return (
    <div className="bg-black/40 border border-white/5 backdrop-blur-xl p-5 rounded-2xl shadow-lg transition-all hover:bg-black/50 flex flex-col justify-between group">
      <div className="flex justify-between items-start mb-2">
        <p className="text-[10px] font-extrabold text-gray-400 tracking-widest uppercase">{title}</p>
        <div className="p-2 rounded-lg bg-white/5 border border-white/10 group-hover:bg-white/10 transition-colors">
          {icon}
        </div>
      </div>
      <div className="flex items-end justify-between mt-2">
        <h4 className="text-2xl md:text-3xl font-black text-white truncate">{value}</h4>
        {trend && (
          <span className={`text-xs font-bold ${trendColor} mb-1 bg-white/5 px-2 py-0.5 rounded`}>
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}