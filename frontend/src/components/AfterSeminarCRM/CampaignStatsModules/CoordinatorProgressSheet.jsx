import React, { useState, useEffect } from 'react';
import axios from '../../../api/axios';
import { 
    FaUserTie, FaDownload, FaChartPie, FaCheckCircle, 
    FaClock, FaUsers, FaChartBar, FaPhoneAlt
} from 'react-icons/fa';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

export default function CoordinatorProgressSheet({ filters = {} }) {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        coordinators: [],
        rawLeads: []
    });

    useEffect(() => {
        // Fetch stats immediately, even if no business is selected (to allow viewing all businesses for System Admin)
        fetchProgressStats();
    }, [filters.selectedBusiness, filters.selectedBatch]);

    const fetchProgressStats = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/after-seminar-crm/stats/coordinator-progress', {
                headers: { Authorization: `Bearer ${token}` },
                params: { 
                    businessId: filters.selectedBusiness, 
                    batchId: filters.selectedBatch || 'ALL'
                }
            });
            setStats(res.data);
        } catch (error) {
            console.error("Failed to load coordinator progress stats", error);
            toast.error("Failed to load Coordinator Progress.");
        } finally {
            setLoading(false);
        }
    };

    const handleExportToExcel = () => {
        if (!stats.rawLeads || stats.rawLeads.length === 0) {
            toast.error("No data available to export.");
            return;
        }

        const exportData = stats.rawLeads.map(l => ({
            "Coordinator Name": l.coordinatorName,
            "Student Phone": l.phone,
            "Student Name": l.name,
            "Inquiry Type": l.inquiryType,
            "Round": l.round,
            "Phase": l.phase,
            "Call Status": l.callStatus,
            "Enrollment": l.enrollmentStatus,
            "Payment Plan": l.paymentPlan,
            "Remark": l.remark
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Coordinator_Progress");

        // Set column widths
        const wscols = [
            {wch: 20}, {wch: 15}, {wch: 25}, {wch: 15}, {wch: 10}, 
            {wch: 10}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 40}
        ];
        worksheet['!cols'] = wscols;

        XLSX.writeFile(workbook, `Coordinator_Progress_Sheet_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success("Progress Sheet Exported successfully!");
    };

    if (loading) return <div className="flex justify-center items-center h-[200px] text-indigo-400 font-bold animate-pulse">Loading Progress Data...</div>;

    const COLORS = ['#3b82f6', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6'];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-[#1e293b] border border-slate-700 p-6 rounded-3xl shadow-xl">
                <div>
                    <h3 className="text-indigo-400 font-black text-xl tracking-wide flex items-center gap-3">
                        <FaUserTie /> Coordinator Progress Sheet
                    </h3>
                    <p className="text-slate-400 text-xs mt-1 font-medium">Detailed breakdown of assigned leads and their call statuses per coordinator.</p>
                </div>
                <button 
                    onClick={handleExportToExcel}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-transform hover:scale-105 uppercase tracking-widest"
                >
                    <FaDownload /> Export Full Data Sheet
                </button>
            </div>

            {(!stats.coordinators || stats.coordinators.length === 0) ? (
                <div className="bg-[#1e293b] p-10 rounded-3xl border border-slate-700 text-center text-slate-500 font-bold">
                    No active assignments found for the selected criteria.
                </div>
            ) : (
                <div className="space-y-8">
                    {stats.coordinators.map((coord, idx) => {
                        const totalAssigned = coord.totalAssigned;
                        const totalPending = coord.openSem.pending + coord.newInq.pending + coord.paid.pending;
                        const totalCovered = coord.openSem.covered + coord.newInq.covered + coord.paid.covered;

                        const pieData = [
                            { name: 'Pending', value: totalPending },
                            { name: 'Covered', value: totalCovered }
                        ];

                        const PIE_COLORS = ['#f59e0b', '#10b981']; // Amber for Pending, Emerald for Covered

                        const barData = [
                            { name: 'Open Sem', pending: coord.openSem.pending, covered: coord.openSem.covered },
                            { name: 'New Inq', pending: coord.newInq.pending, covered: coord.newInq.covered },
                            { name: 'Paid Camp', pending: coord.paid.pending, covered: coord.paid.covered }
                        ];

                        return (
                            <div key={idx} className="bg-[#1e293b]/50 backdrop-blur-md border border-slate-700/50 rounded-3xl p-6 shadow-lg">
                                <div className="flex items-center justify-between border-b border-slate-700 pb-4 mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-indigo-500/20 text-indigo-400 rounded-2xl flex justify-center items-center shadow-inner">
                                            <FaUserTie size={20} />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-black text-lg">{coord.name}</h4>
                                            <div className="flex gap-4 mt-1">
                                                <span className="text-xs text-blue-400 font-bold bg-blue-500/10 px-3 py-1 rounded-lg">Total Assigned: {totalAssigned}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-8">
                                        <div className="text-center bg-[#0f172a]/50 px-6 py-3 rounded-2xl border border-emerald-500/20">
                                            <p className="text-xs text-emerald-500/70 font-bold uppercase tracking-widest mb-1">Covered</p>
                                            <h3 className="text-3xl font-black text-emerald-400 flex items-center justify-center gap-2"><FaCheckCircle size={18}/> {totalCovered}</h3>
                                        </div>
                                        <div className="text-center bg-[#0f172a]/50 px-6 py-3 rounded-2xl border border-amber-500/20">
                                            <p className="text-xs text-amber-500/70 font-bold uppercase tracking-widest mb-1">Pending</p>
                                            <h3 className="text-3xl font-black text-amber-400 flex items-center justify-center gap-2"><FaClock size={18}/> {totalPending}</h3>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                                    {/* PIE CHART - Pending vs Covered */}
                                    <div className="bg-[#0f172a]/80 p-6 rounded-3xl shadow-inner flex flex-col justify-center border border-slate-800">
                                        <h5 className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-4 flex items-center gap-2"><FaChartPie size={16}/> Overall Progress</h5>
                                        <div className="h-[260px]">
                                            {totalAssigned > 0 ? (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                                                            {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                                                        </Pie>
                                                        <RechartsTooltip contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '12px', fontSize:'14px', color: '#fff', padding: '12px'}} />
                                                        <Legend verticalAlign="bottom" height={36} wrapperStyle={{fontSize: '12px', color: '#94a3b8', fontWeight: 'bold', paddingTop: '20px'}} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <div className="flex h-full items-center justify-center text-slate-600 text-sm font-bold">No Data</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* BAR CHART - By Campaign Type */}
                                    <div className="bg-[#0f172a]/80 p-6 rounded-3xl shadow-inner border border-slate-800 lg:col-span-2">
                                        <h5 className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-4 flex items-center gap-2"><FaChartBar size={16}/> Campaign Breakdown</h5>
                                        <div className="h-[260px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                                                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                                    <RechartsTooltip cursor={{fill: '#ffffff05'}} contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '12px', fontSize:'14px', color: '#fff', padding: '12px'}} />
                                                    <Legend verticalAlign="top" height={36} wrapperStyle={{fontSize: '12px', color: '#94a3b8', fontWeight: 'bold', paddingBottom: '20px'}} />
                                                    <Bar dataKey="covered" name="Covered Leads" fill="#10b981" radius={[6, 6, 0, 0]} barSize={40} />
                                                    <Bar dataKey="pending" name="Pending Leads" fill="#f59e0b" radius={[6, 6, 0, 0]} barSize={40} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>

                                {/* ROUND BREAKDOWN FOR OPEN SEMINAR */}
                                {Object.keys(coord.openSem.rounds).length > 0 && (
                                    <div className="mt-8 border-t border-slate-700/50 pt-6">
                                        <h5 className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                                            <FaPhoneAlt size={14}/> Open Seminar - Detailed Round Breakdown
                                        </h5>
                                        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
                                            {Object.keys(coord.openSem.rounds).map(rNum => {
                                                const rData = coord.openSem.rounds[rNum];
                                                return (
                                                    <div key={rNum} className="bg-[#0f172a] border border-slate-800 p-5 rounded-2xl shadow-sm text-center relative overflow-hidden group">
                                                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                                                        <h6 className="text-white text-sm font-black tracking-wider mb-3">Round {rNum}</h6>
                                                        <div className="flex justify-between items-center text-xs font-bold py-1 border-b border-white/5">
                                                            <span className="text-slate-400">Total</span>
                                                            <span className="text-blue-400 text-sm">{rData.total}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-xs font-bold py-1 border-b border-white/5 mt-1">
                                                            <span className="text-slate-400">Covered</span>
                                                            <span className="text-emerald-400 text-sm">{rData.covered}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-xs font-bold py-1 mt-1">
                                                            <span className="text-slate-400">Pending</span>
                                                            <span className="text-amber-400 text-sm">{rData.pending}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
