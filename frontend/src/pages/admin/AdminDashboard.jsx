import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Database, AlertTriangle, Activity, CheckCircle2, Terminal, HardDrive, Cpu, Server, Shield, MessageCircle } from 'lucide-react';
import { io } from 'socket.io-client';
import { AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, CartesianGrid, YAxis } from 'recharts';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import AdminAuditTrail from './AdminAuditTrail';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState("");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [activeView, setActiveView] = useState('overview'); // 'overview' | 'audit'
  const terminalContainerRef = useRef(null);
  
  // WhatsApp Monitor State
  const [waAlerts, setWaAlerts] = useState([]);
  const [waStatus, setWaStatus] = useState(null);
  const socketRef = useRef(null);

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
    
    const fetchWaAlerts = async () => {
      try {
        const response = await api.get('/admin/whatsapp-call/alerts');
        if (response.data.success) {
           setWaAlerts(response.data.alerts);
        }
      } catch (err) {
        console.warn("WA Alerts Fetch Error", err);
      }
    };
    
    const fetchWaStatus = async () => {
        try {
            const res = await api.get('/admin/whatsapp-call/status');
            if(res.data.success) {
                setWaStatus(res.data.data);
            }
        } catch(err) {
            console.warn("WA Status Fetch Error", err);
        }
    };
    const fetchMaintenanceMode = () => {
        api.get('/admin/settings/maintenance-mode')
           .then(res => setMaintenanceMode(res.data.active))
           .catch(err => console.warn("Failed to fetch maintenance mode", err));
    };
    fetchDashboardData();
    fetchMaintenanceMode();
    fetchWaAlerts();
    fetchWaStatus();
    
    // Socket Setup
    const token = localStorage.getItem('token');
    const socketUrl = api.defaults.baseURL ? api.defaults.baseURL.replace('/api', '') : 'http://localhost:5000';
    socketRef.current = io(socketUrl, { auth: { token }, transports: ['websocket', 'polling'] });
    
    socketRef.current.on('whatsapp_alert', (newAlert) => {
        setWaAlerts(prev => [newAlert, ...prev].slice(0, 50));
        toast.custom((t) => (
          <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-slate-900 border border-emerald-500 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <MessageCircle className="h-10 w-10 text-emerald-400" />
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-bold text-white">WhatsApp Alert: {newAlert.alertType}</p>
                  <p className="mt-1 text-sm text-gray-300">{newAlert.message}</p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-gray-700">
              <button onClick={() => toast.dismiss(t.id)} className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-gray-400 hover:text-white focus:outline-none">
                Close
              </button>
            </div>
          </div>
        ));
    });

    const interval = setInterval(() => {
        fetchDashboardData();
        fetchMaintenanceMode();
        fetchWaStatus();
    }, 10000);
    
    return () => {
        clearInterval(interval);
        if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const toggleMaintenanceMode = async (newVal) => {
      setMaintenanceMode(newVal);
      try {
          await api.put('/admin/settings/maintenance-mode', { 
              active: newVal, 
              messageEn: "System is under update. Some features may not work properly. If you face any issues, please mention in the WhatsApp group.",
              messageSi: "පද්ධතිය යාවත්කාලීන වෙමින් පවතී. සමහර පහසුකම් නිසියාකාරව ක්‍රියා නොකිරීමට ඉඩ ඇත. යම් ගැටලුවක් ඇත්නම් කරුණාකර WhatsApp Group එකට දැනුම් දෙන්න." 
          });
          toast.success(`System Maintenance Mode ${newVal ? 'ACTIVATED' : 'DEACTIVATED'}!`);
      } catch (error) {
          toast.error("Failed to update maintenance mode");
          setMaintenanceMode(!newVal);
      }
  };

  // Fetch Live Logs
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await api.get('/admin/logs');
        setLogs(response.data);
        if (terminalContainerRef.current) {
          terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
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

  if (activeView === 'audit') {
      return (
          <div className="w-full min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#020617] p-4 md:p-8">
              <button 
                  onClick={() => setActiveView('overview')}
                  className="mb-4 flex items-center text-gray-400 hover:text-white transition-colors"
              >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                  Back to Dashboard
              </button>
              <AdminAuditTrail />
          </div>
      );
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#020617] animate-fade-in pb-10 px-4 md:px-8 pt-6 relative overflow-hidden rounded-2xl shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]">
      {/* Decorative background blurs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] pointer-events-none"></div>
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8 relative z-10">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">System Monitor</h2>
          <p className="text-sm font-medium text-emerald-400 mt-1 flex items-center gap-2">
             <Activity size={14} className="animate-pulse" /> Live Server Synchronization Active
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setActiveView('audit')} 
            className="flex items-center justify-center gap-2 bg-blue-900/40 hover:bg-blue-800 text-blue-300 border border-blue-700/50 px-5 py-2.5 rounded-lg text-sm font-bold shadow-lg transition-all"
          >
            <Shield size={16} /> 
            Audit Trail
          </button>
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

      {/* SYSTEM MAINTENANCE WIDGET */}
      <div className={`mb-8 p-6 rounded-2xl border backdrop-blur-xl shadow-lg flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-300 ${maintenanceMode ? 'bg-amber-500/10 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.2)]' : 'bg-white/5 border-white/10'}`}>
          <div className="flex items-center gap-5">
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${maintenanceMode ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-gray-400'}`}>
                  <AlertTriangle size={24} className={maintenanceMode ? 'animate-pulse' : ''}/>
              </div>
              <div>
                  <h3 className={`text-lg font-black tracking-tight ${maintenanceMode ? 'text-amber-400' : 'text-white'}`}>Global Maintenance Mode</h3>
                  <p className="text-gray-400 text-xs mt-1 font-medium">Toggle this to show the system update warning banner to all staff.</p>
              </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input type="checkbox" className="sr-only peer" checked={maintenanceMode} onChange={(e) => toggleMaintenanceMode(e.target.checked)} />
              <div className="w-14 h-7 bg-black/50 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500 border border-white/20"></div>
              <span className={`ml-3 text-xs font-bold uppercase tracking-wider ${maintenanceMode ? 'text-amber-400' : 'text-gray-500'}`}>{maintenanceMode ? 'ACTIVE' : 'OFF'}</span>
          </label>
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
        <div className="xl:col-span-2 flex flex-col gap-6 relative z-10">
          
          {/* Server Load Area Chart */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-2xl p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] transition-all duration-300">
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
              <div className="bg-white/5 border border-white/10 backdrop-blur-2xl p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] transition-all duration-300 flex flex-col items-center">
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
              <div className="bg-white/5 border border-white/10 backdrop-blur-2xl p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_0_20px_rgba(139,92,246,0.15)] transition-all duration-300">
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

        {/* Right Side: WhatsApp Monitor */}
        <div className="xl:col-span-1 bg-gradient-to-b from-[#0f172a] to-[#020617] border border-emerald-500/20 rounded-3xl flex flex-col overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.1)] backdrop-blur-xl relative z-10">
          <div className="bg-[#111]/90 backdrop-blur-md px-5 py-4 flex items-center justify-between border-b border-emerald-500/20">
            <div className="flex items-center gap-3">
              <MessageCircle size={18} className="text-emerald-400" />
              <p className="text-[13px] text-white font-bold tracking-wider">
                WhatsApp Status Monitor
              </p>
            </div>
            <div className="text-[10px] text-emerald-500 animate-pulse font-mono flex items-center gap-1 font-bold bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span> LIVE
            </div>
          </div>
          
          {waStatus && waStatus.length > 0 && (
              <div className="border-b border-gray-800 bg-black/40 overflow-x-auto custom-scrollbar">
                  <div className="flex gap-4 p-4 min-w-max">
                      {waStatus.map((status, index) => (
                          <div key={status.id || index} className="flex-shrink-0 bg-[#0f172a] border border-slate-700/50 p-3 rounded-2xl flex flex-col justify-between w-64 shadow-lg">
                              <div className="mb-3">
                                  <p className="text-[13px] font-bold text-white truncate font-sans tracking-wide">{status.verified_name || 'Business Account'}</p>
                                  <p className="text-[11px] text-emerald-400 font-mono mt-0.5 opacity-80">{status.display_phone_number || status.id}</p>
                              </div>
                              <div className="flex items-center justify-between mt-auto">
                                  <div className="flex items-center gap-1.5">
                                      <span className="text-[9px] text-gray-500 font-bold tracking-widest uppercase">QLTY</span>
                                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                          status.quality_rating === 'GREEN' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.15)]' :
                                          status.quality_rating === 'YELLOW' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.15)]' :
                                          'bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-[0_0_8px_rgba(244,63,94,0.15)]'
                                      }`}>
                                          {status.quality_rating}
                                      </span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                      <span className="text-[9px] text-gray-500 font-bold tracking-widest uppercase">STS</span>
                                      <span className={`text-[10px] font-bold font-sans ${status.status === 'CONNECTED' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                          {status.status}
                                      </span>
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          <div className="flex-1 p-5 overflow-y-auto max-h-[500px] scroll-smooth custom-scrollbar">
             {waAlerts.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-3">
                     <CheckCircle2 size={40} className="text-emerald-500/30" />
                     <p className="text-sm font-medium">All systems normal. No alerts yet.</p>
                 </div>
             ) : (
                 <div className="space-y-4">
                     {waAlerts.map((alert, idx) => {
                         let isCritical = alert.alertType.includes('block') || alert.message.toLowerCase().includes('reject');
                         return (
                             <div key={alert.id || idx} className={`p-4 rounded-xl border backdrop-blur-sm transition-all hover:-translate-y-0.5 ${isCritical ? 'bg-rose-500/10 border-rose-500/30 hover:shadow-[0_0_15px_rgba(244,63,94,0.2)]' : 'bg-emerald-500/5 border-emerald-500/20 hover:shadow-[0_0_15px_rgba(16,185,129,0.15)]'}`}>
                                 <div className="flex justify-between items-start mb-2">
                                     <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md ${isCritical ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                         {alert.alertType.replace(/_/g, ' ')}
                                     </span>
                                     <span className="text-[10px] text-gray-500 font-mono">
                                         {new Date(alert.createdAt).toLocaleTimeString()}
                                     </span>
                                 </div>
                                 <p className="text-sm text-gray-300 font-medium">
                                     {alert.message}
                                 </p>
                             </div>
                         )
                     })}
                 </div>
             )}
          </div>
        </div>

      </div>

    </div>
  );
}

function StatCard({ title, value, icon, trend, trendColor }) {
  return (
    <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 hover:bg-white/10 hover:shadow-[0_0_25px_rgba(16,185,129,0.15)] hover:-translate-y-1 flex flex-col justify-between group relative overflow-hidden z-10">
      {/* Glow effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
      
      <div className="flex justify-between items-start mb-2 relative z-10">
        <p className="text-[11px] font-extrabold text-gray-400 tracking-widest uppercase">{title}</p>
        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 group-hover:bg-white/10 transition-colors shadow-inner">
          {icon}
        </div>
      </div>
      <div className="flex items-end justify-between mt-4 relative z-10">
        <h4 className="text-3xl md:text-4xl font-black text-white truncate tracking-tight drop-shadow-md">{value}</h4>
        {trend && (
          <span className={`text-xs font-bold ${trendColor} mb-1 bg-white/5 px-2.5 py-1 rounded-md backdrop-blur-sm border border-white/5 shadow-sm`}>
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}