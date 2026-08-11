import React, { useState, useEffect } from 'react';
import axios from '../../../api/axios';
import toast from 'react-hot-toast';
import { BarChart3, Download, Loader2, FileText, Search, User, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

export default function StockReports() {
    const [reportFilters, setReportFilters] = useState({ dateType: 'this_month', startDate: '', endDate: '', lecturers: [], paymentType: 'All', searchQuery: '' });
    const [reportData, setReportData] = useState([]);
    const [reportLoading, setReportLoading] = useState(false);
    
    const [lecturers, setLecturers] = useState([]);

    useEffect(() => {
        setMonthDates('this_month');
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const res = await axios.get('/admin/delivery/stats');
            setLecturers(res.data.lecturers || []);
        } catch (error) {
            toast.error("Failed to fetch initial filters");
        }
    };

    const toggleLecturer = (lec) => {
        setReportFilters(prev => {
            const current = [...prev.lecturers];
            if (current.includes(lec)) return { ...prev, lecturers: current.filter(l => l !== lec) };
            return { ...prev, lecturers: [...current, lec] };
        });
    };

    const toggleAllLecturers = () => {
        if (reportFilters.lecturers.length === lecturers.length) {
            setReportFilters(prev => ({ ...prev, lecturers: [] }));
        } else {
            setReportFilters(prev => ({ ...prev, lecturers: [...lecturers] }));
        }
    };

    const setMonthDates = (type) => {
        const today = new Date();
        let start = new Date();
        let end = new Date();
        if (type === 'this_month') {
            start = new Date(today.getFullYear(), today.getMonth(), 1);
            end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        } else if (type === 'last_month') {
            start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            end = new Date(today.getFullYear(), today.getMonth(), 0);
        }
        setReportFilters(prev => ({ 
            ...prev, dateType: type, 
            startDate: start.toISOString().split('T')[0], 
            endDate: end.toISOString().split('T')[0] 
        }));
    };

    const generateReport = async () => {
        setReportLoading(true);
        try {
            const lecParam = reportFilters.lecturers.length > 0 ? JSON.stringify(reportFilters.lecturers) : 'All';
            const params = new URLSearchParams({
                startDate: reportFilters.startDate, 
                endDate: reportFilters.endDate,
                lecturers: lecParam,
                paymentType: reportFilters.paymentType
            });
            const res = await axios.get(`/admin/delivery/stock/analytics?${params.toString()}`);
            setReportData(res.data || []);
            if(res.data.length === 0) toast.error("No data found for these filters");
        } catch (error) {
            toast.error("Failed to generate report");
        } finally {
            setReportLoading(false);
        }
    };

    const exportReportCSV = () => {
        if(reportData.length === 0) return toast.error("No data to export");
        const headers = ["Lecturer", "Payment Type", "Course", "Material Name", "Delivered Qty", "Remaining Stock"];
        const rows = reportData.map(r => `"${r.lecturerName}","${r.paymentType}","${r.courseName}","${r.tuteName}","${r.deliveredQty}","${r.currentStock}"`);
        const csvContent = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute("download", `Stock_Analytics_${reportFilters.startDate}_to_${reportFilters.endDate}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    const filteredData = reportData.filter(row => {
        if (!reportFilters.searchQuery) return true;
        const q = reportFilters.searchQuery.toLowerCase();
        return (row.lecturerName && row.lecturerName.toLowerCase().includes(q)) || 
               (row.courseName && row.courseName.toLowerCase().includes(q)) ||
               (row.tuteName && row.tuteName.toLowerCase().includes(q));
    });

    const chartData = filteredData.map(item => {
        const tName = item.tuteName || '';
        return {
            name: tName.substring(0, 15) + (tName.length > 15 ? '...' : ''),
            Delivered: item.deliveredQty,
            Remaining: item.currentStock
        };
    }).slice(0, 20); // Show max 20 on chart

    return (
        <div className="animate-fade-in font-sans relative z-10 w-full h-full flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-gray-200 dark:border-white/10 pb-5">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3"><BarChart3 size={28} className="text-brand-accent"/> Advanced Stock Analytics</h2>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 font-bold">Track deliveries and stock levels lecturer-wise.</p>
                </div>
            </div>

            <div className="bg-white/80 dark:bg-black/30 p-6 rounded-[1.5rem] border border-gray-200 dark:border-white/10 mb-6 shrink-0 shadow-sm backdrop-blur-md">
                
                {/* LECTURER CARDS GRID */}
                <div className="mb-6">
                    <div className="flex justify-between items-end mb-3">
                        <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">Select Lecturers</label>
                        <button onClick={toggleAllLecturers} className="text-xs font-bold text-brand-accent hover:underline">
                            {reportFilters.lecturers.length === lecturers.length ? 'Deselect All' : 'Select All'}
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-3 max-h-56 overflow-y-auto custom-scrollbar pr-2 pb-2">
                        {lecturers.map(lec => {
                            const isSelected = reportFilters.lecturers.includes(lec);
                            return (
                                <button 
                                    key={lec} 
                                    onClick={() => toggleLecturer(lec)}
                                    title={lec}
                                    className={`px-4 py-2 rounded-xl border text-sm font-bold flex items-center gap-2 transition-all duration-200 shadow-sm max-w-xs
                                        ${isSelected ? 'bg-brand-accent/10 border-brand-accent text-brand-accent dark:bg-brand-accent/20' : 'bg-white dark:bg-black/40 border-gray-200 dark:border-white/10 text-gray-600 dark:text-slate-300 hover:border-brand-accent/50'}
                                    `}
                                >
                                    {isSelected ? <CheckCircle2 size={16} className="shrink-0" /> : <User size={16} className="shrink-0 opacity-50" />}
                                    <span className="truncate">{lec}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 border-t border-gray-200 dark:border-white/10 pt-5">
                    
                    <div>
                        <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-2 block uppercase tracking-widest">Time Period</label>
                        <div className="flex gap-2 mb-2">
                            <button onClick={() => setMonthDates('this_month')} className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border transition-colors ${reportFilters.dateType === 'this_month' ? 'bg-brand-accent border-brand-accent text-white shadow-md' : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-slate-300'}`}>This Month</button>
                            <button onClick={() => setMonthDates('last_month')} className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border transition-colors ${reportFilters.dateType === 'last_month' ? 'bg-brand-accent border-brand-accent text-white shadow-md' : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-slate-300'}`}>Last Month</button>
                            <button onClick={() => setReportFilters({...reportFilters, dateType: 'custom'})} className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border transition-colors ${reportFilters.dateType === 'custom' ? 'bg-brand-accent border-brand-accent text-white shadow-md' : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-slate-300'}`}>Custom</button>
                        </div>
                        {reportFilters.dateType === 'custom' && (
                            <div className="flex items-center gap-2">
                                <input type="date" value={reportFilters.startDate} onChange={e => setReportFilters({...reportFilters, startDate: e.target.value})} className="flex-1 bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-slate-300 outline-none focus:border-brand-accent [color-scheme:light] dark:[color-scheme:dark] shadow-inner"/>
                                <span className="text-gray-400 font-black">-</span>
                                <input type="date" value={reportFilters.endDate} onChange={e => setReportFilters({...reportFilters, endDate: e.target.value})} className="flex-1 bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-slate-300 outline-none focus:border-brand-accent [color-scheme:light] dark:[color-scheme:dark] shadow-inner"/>
                            </div>
                        )}
                    </div>
                    
                    <div>
                        <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-2 block uppercase tracking-widest">Payment Type</label>
                        <select value={reportFilters.paymentType} onChange={e => setReportFilters({...reportFilters, paymentType: e.target.value})} className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 dark:text-slate-200 outline-none focus:border-brand-accent shadow-inner h-[42px]">
                            <option value="All">All Payments</option>
                            <option value="Full">Full Payment</option>
                            <option value="Monthly">Monthly</option>
                        </select>
                    </div>

                    <div className="flex flex-col justify-end gap-3 pb-0">
                        <div className="flex gap-3 h-[42px]">
                            <button onClick={exportReportCSV} disabled={reportData.length === 0} className="flex-1 bg-white/80 dark:bg-white/5 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl font-black uppercase tracking-widest text-xs flex justify-center items-center gap-2 disabled:opacity-50 shadow-sm">
                                <Download size={16}/> CSV
                            </button>
                            <button onClick={generateReport} disabled={reportLoading} className="flex-[2] bg-brand-accent hover:bg-brand-accentHover text-white rounded-xl font-black uppercase tracking-widest text-xs flex justify-center items-center gap-2 shadow-lg shadow-brand-accent/30">
                                {reportLoading ? <Loader2 size={16} className="animate-spin"/> : <BarChart3 size={16}/>} Generate
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-5 border-t border-gray-200 dark:border-white/10 pt-5">
                    <div className="relative w-full md:w-96">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" value={reportFilters.searchQuery} onChange={e => setReportFilters({...reportFilters, searchQuery: e.target.value})} placeholder="Search Material, Subject..." className="w-full pl-10 pr-4 py-3 bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-bold outline-none focus:border-brand-accent shadow-inner" />
                    </div>
                </div>
            </div>

            {chartData.length > 0 && !reportLoading && (
                <div className="bg-white/80 dark:bg-black/30 p-6 rounded-[1.5rem] border border-gray-200 dark:border-white/10 mb-6 shrink-0 shadow-sm backdrop-blur-md h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" vertical={false} />
                            <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff'}} itemStyle={{fontWeight: 900}} />
                            <Legend wrapperStyle={{fontSize: '12px', fontWeight: 'bold'}} />
                            <Bar dataKey="Delivered" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Remaining" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            <div className="flex-1 overflow-y-auto custom-scrollbar bg-white/60 dark:bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 relative shadow-inner">
                {reportLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center"><Loader2 size={36} className="animate-spin text-brand-accent"/></div>
                ) : filteredData.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 dark:text-slate-500">
                        <FileText size={48} className="mb-4 opacity-40"/>
                        <p className="text-base font-bold">No records found. Adjust filters and generate.</p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse min-w-max">
                        <thead className="bg-white/90 dark:bg-black/40 backdrop-blur-md sticky top-0 border-b border-gray-200 dark:border-white/10 z-10">
                            <tr className="text-[11px] uppercase tracking-widest text-gray-500 dark:text-slate-400">
                                <th className="p-4 font-black">Lecturer</th>
                                <th className="p-4 font-black">Subject & Payment</th>
                                <th className="p-4 font-black">Material Name</th>
                                <th className="p-4 font-black text-center">Total Delivered</th>
                                <th className="p-4 font-black text-center">Remaining Stock</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                            {filteredData.map((row, idx) => (
                                <tr key={idx} className="hover:bg-white/60 dark:hover:bg-white/[0.05] transition-colors">
                                    <td className="p-4">
                                        <p className="font-black text-gray-900 dark:text-slate-200 text-sm">{row.lecturerName}</p>
                                    </td>
                                    <td className="p-4">
                                        <p className="font-bold text-gray-700 dark:text-slate-300 text-sm mb-1.5">{row.courseName}</p>
                                        <span className={`inline-block px-2.5 py-1 rounded-md border text-[9px] font-black uppercase tracking-widest shadow-sm ${(row.paymentType || '').toLowerCase().includes('monthly') ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200' : 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200'}`}>{row.paymentType || 'Unknown'}</span>
                                    </td>
                                    <td className="p-4 text-sm font-bold text-gray-600 dark:text-slate-400">{row.tuteName}</td>
                                    <td className="p-4 text-center">
                                        <span className="text-sm font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-3 py-1 rounded-lg border border-blue-200 shadow-sm">{row.deliveredQty}</span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className={`text-sm font-black px-3 py-1 rounded-lg border shadow-sm ${row.currentStock <= 10 ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-200' : 'text-gray-700 dark:text-slate-200 bg-gray-100 dark:bg-black/40 border-gray-200'}`}>
                                            {row.currentStock}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
