import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
// actually let's use standard react-icons
import { FaPhone, FaComment, FaCheckCircle, FaUserFriends, FaRegListAlt, FaSyncAlt, FaChartLine, FaPercentage } from 'react-icons/fa';
import { MdOutlineIncompleteCircle, MdDoneAll, MdSave } from 'react-icons/md';
import { BiTask } from 'react-icons/bi';
import { toast } from 'react-hot-toast';

const DedicatedCoordinatorOverview = ({ selectedBusiness, selectedBatch }) => {
    const [stats, setStats] = useState(null);
    const [logs, setLogs] = useState({ today: { newInqCalls: 0, generalInqCalls: 0 }, monthlyTotal: { newInqCalls: 0, generalInqCalls: 0 } });
    const [loading, setLoading] = useState(true);
    
    const [newInqInput, setNewInqInput] = useState(0);
    const [genInqInput, setGenInqInput] = useState(0);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = {};
            if (selectedBusiness) params.businessId = selectedBusiness;
            if (selectedBatch && selectedBatch !== 'ALL') params.batchId = selectedBatch;

            const [statsRes, logsRes] = await Promise.all([
                axios.get('/coordinator-crm/v2-overview-stats', { headers: { Authorization: `Bearer ${token}` }, params }),
                axios.get('/coordinator-crm/v2-daily-logs', { headers: { Authorization: `Bearer ${token}` }, params })
            ]);

            setStats(statsRes.data);
            setLogs(logsRes.data);
            setNewInqInput(logsRes.data.today?.newInqCalls || 0);
            setGenInqInput(logsRes.data.today?.generalInqCalls || 0);
        } catch (error) {
            console.error("Failed to load dashboard stats", error);
            toast.error("Failed to load dashboard metrics");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, [selectedBusiness, selectedBatch]);

    const handleSaveLogs = async () => {
        const toastId = toast.loading("Saving daily logs...");
        try {
            const token = localStorage.getItem('token');
            await axios.post('/coordinator-crm/v2-daily-logs', {
                newInqCalls: newInqInput,
                generalInqCalls: genInqInput
            }, { headers: { Authorization: `Bearer ${token}` }});
            toast.success("Logs saved successfully!", { id: toastId });
            fetchDashboardData(); // refresh monthly totals
        } catch (error) {
            toast.error("Failed to save logs", { id: toastId });
        }
    };

    if (loading && !stats) {
        return (
            <div className="flex items-center justify-center h-[70vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 max-h-screen overflow-y-auto custom-scrollbar pb-32">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-white">Coordinator Overview</h1>
                    <p className="text-slate-400 mt-1">Track your daily tasks, communication metrics, and performance rates.</p>
                </div>
                <button onClick={fetchDashboardData} className="p-3 bg-[#1e293b] rounded-full text-slate-300 hover:text-white hover:bg-slate-700 transition">
                    <FaSyncAlt className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* OVERALL PERFORMANCE */}
            <div>
                <h2 className="text-lg font-bold text-slate-300 mb-4 flex items-center gap-2">
                    <FaChartLine className="text-blue-500" /> Overall Performance
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* ASSIGNED */}
                    <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] p-5 rounded-2xl border border-slate-700 shadow-xl relative overflow-hidden group">
                        <div className="absolute -right-6 -top-6 text-slate-700/30 group-hover:scale-110 transition-transform"><FaUserFriends size={100} /></div>
                        <p className="text-slate-400 text-sm font-semibold mb-1">Total Assigned</p>
                        <h3 className="text-4xl font-black text-white">{stats?.overall?.assigned || 0}</h3>
                    </div>

                    {/* ENROLLED */}
                    <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] p-5 rounded-2xl border border-emerald-900/30 shadow-xl relative overflow-hidden group">
                        <div className="absolute -right-6 -top-6 text-emerald-900/20 group-hover:scale-110 transition-transform"><FaCheckCircle size={100} /></div>
                        <p className="text-emerald-400 text-sm font-semibold mb-1">Total Enrolled</p>
                        <h3 className="text-4xl font-black text-emerald-400">{stats?.overall?.enrolled || 0}</h3>
                    </div>

                    {/* COVERED */}
                    <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] p-5 rounded-2xl border border-blue-900/30 shadow-xl relative overflow-hidden group">
                        <div className="absolute -right-6 -top-6 text-blue-900/20 group-hover:scale-110 transition-transform"><MdDoneAll size={100} /></div>
                        <p className="text-blue-400 text-sm font-semibold mb-1">Total Covered</p>
                        <h3 className="text-4xl font-black text-blue-400">{stats?.overall?.covered || 0}</h3>
                    </div>

                    {/* PENDING */}
                    <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] p-5 rounded-2xl border border-orange-900/30 shadow-xl relative overflow-hidden group">
                        <div className="absolute -right-6 -top-6 text-orange-900/20 group-hover:scale-110 transition-transform"><MdOutlineIncompleteCircle size={100} /></div>
                        <p className="text-orange-400 text-sm font-semibold mb-1">Total Pending</p>
                        <h3 className="text-4xl font-black text-orange-400">{stats?.overall?.pending || 0}</h3>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                     <div className="bg-[#1e293b] border border-slate-700 rounded-2xl p-5 flex items-center justify-between">
                         <div>
                             <p className="text-slate-400 text-sm font-bold">Conversion Rate (Enrolled / Assigned)</p>
                             <h3 className="text-3xl font-black text-emerald-400 mt-1">{stats?.overall?.conversionRate || 0}%</h3>
                         </div>
                         <div className="w-16 h-16 rounded-full border-4 border-emerald-500/30 flex items-center justify-center text-emerald-500">
                             <FaPercentage size={24} />
                         </div>
                     </div>
                     <div className="bg-[#1e293b] border border-slate-700 rounded-2xl p-5 flex items-center justify-between">
                         <div>
                             <p className="text-slate-400 text-sm font-bold">Response Rate (Call Answers / Covered)</p>
                             <h3 className="text-3xl font-black text-blue-400 mt-1">{stats?.overall?.responseRate || 0}%</h3>
                         </div>
                         <div className="w-16 h-16 rounded-full border-4 border-blue-500/30 flex items-center justify-center text-blue-500">
                             <FaPhone size={24} />
                         </div>
                     </div>
                </div>
            </div>

            {/* TODAY SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Manual Call Logs */}
                <div className="bg-[#1e293b] border border-slate-700 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <FaPhone className="text-blue-500" /> Today's Incoming Calls
                    </h2>
                    <p className="text-slate-400 text-sm mb-5">Manually input the number of calls you received today. Don't forget to save!</p>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="text-xs text-slate-400 font-bold mb-1 block">New Inq Calls</label>
                            <input 
                                type="number" 
                                value={newInqInput} 
                                onChange={(e) => setNewInqInput(e.target.value)} 
                                className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-3 text-white text-xl font-bold focus:border-blue-500 outline-none transition"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 font-bold mb-1 block">General Inq Calls</label>
                            <input 
                                type="number" 
                                value={genInqInput} 
                                onChange={(e) => setGenInqInput(e.target.value)} 
                                className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-3 text-white text-xl font-bold focus:border-blue-500 outline-none transition"
                            />
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handleSaveLogs}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition shadow-lg shadow-blue-500/20"
                        >
                            <MdSave size={20} /> Save Today's Log
                        </button>
                    </div>

                    <div className="mt-6 pt-6 border-t border-slate-700">
                        <h3 className="text-sm font-bold text-slate-300 mb-3">Monthly Accumulation</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[#0f172a] p-3 rounded-lg border border-slate-800">
                                <p className="text-xs text-slate-500">Total New Inq Calls</p>
                                <p className="text-2xl font-black text-white">{logs?.monthlyTotal?.newInqCalls || 0}</p>
                            </div>
                            <div className="bg-[#0f172a] p-3 rounded-lg border border-slate-800">
                                <p className="text-xs text-slate-500">Total General Inq Calls</p>
                                <p className="text-2xl font-black text-white">{logs?.monthlyTotal?.generalInqCalls || 0}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Today Auto Stats */}
                <div className="space-y-6">
                    {/* Auto Messages */}
                    <div className="bg-[#1e293b] border border-slate-700 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <FaComment className="text-emerald-500" /> Today's Message Flow
                        </h2>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-[#0f172a] rounded-xl p-4 text-center border border-slate-800">
                                <p className="text-xs text-slate-400 font-semibold mb-1">Messages Sent</p>
                                <h3 className="text-3xl font-black text-emerald-400">{stats?.today?.msgsSent || 0}</h3>
                            </div>
                            <div className="bg-[#0f172a] rounded-xl p-4 text-center border border-slate-800">
                                <p className="text-xs text-slate-400 font-semibold mb-1">Received</p>
                                <h3 className="text-3xl font-black text-emerald-400">{stats?.today?.msgsReceived || 0}</h3>
                            </div>
                            <div className="bg-[#0f172a] rounded-xl p-4 text-center border border-slate-800">
                                <p className="text-xs text-slate-400 font-semibold mb-1">Unique Contacts</p>
                                <h3 className="text-3xl font-black text-blue-400">{stats?.today?.uniqueNumbers || 0}</h3>
                            </div>
                        </div>
                    </div>

                    {/* Today Covers */}
                    <div className="bg-[#1e293b] border border-slate-700 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <MdDoneAll className="text-purple-500" /> Today's Leads Covered
                        </h2>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-[#0f172a] rounded-xl p-4 text-center border border-slate-800">
                                <p className="text-xs text-slate-400 font-semibold mb-1">New Inq</p>
                                <h3 className="text-2xl font-black text-purple-400">{stats?.today?.covers?.newInq || 0}</h3>
                            </div>
                            <div className="bg-[#0f172a] rounded-xl p-4 text-center border border-slate-800">
                                <p className="text-xs text-slate-400 font-semibold mb-1">Open Sem</p>
                                <h3 className="text-2xl font-black text-purple-400">{stats?.today?.covers?.openSem || 0}</h3>
                            </div>
                            <div className="bg-[#0f172a] rounded-xl p-4 text-center border border-slate-800">
                                <p className="text-xs text-slate-400 font-semibold mb-1">Paid</p>
                                <h3 className="text-2xl font-black text-emerald-400">{stats?.today?.covers?.paid || 0}</h3>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* TASK CENTER */}
            <div className="bg-[#1e293b] border border-slate-700 rounded-3xl p-6 shadow-xl relative overflow-hidden mt-6">
                 <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
                 <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                     <BiTask className="text-orange-500" size={24}/> Task Center (Assigned to You)
                 </h2>
                 {stats?.tasks && stats.tasks.length > 0 ? (
                     <div className="space-y-3">
                         {stats.tasks.map(task => (
                             <div key={task.id} className="bg-[#0f172a] border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                                 <div>
                                     <h3 className="text-white font-bold">{task.title}</h3>
                                     <p className="text-sm text-slate-400">{task.description}</p>
                                 </div>
                                 <span className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-xs font-bold border border-orange-500/30">
                                     {task.status || 'PENDING'}
                                 </span>
                             </div>
                         ))}
                     </div>
                 ) : (
                     <div className="text-center py-10 bg-[#0f172a] rounded-xl border border-dashed border-slate-700">
                         <BiTask className="mx-auto text-slate-600 mb-2" size={40} />
                         <p className="text-slate-500 font-semibold">No pending tasks for today!</p>
                     </div>
                 )}
            </div>
            
        </div>
    );
};

export default DedicatedCoordinatorOverview;
