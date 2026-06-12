import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { Database, Filter, AlertTriangle, LayoutDashboard, Target } from 'lucide-react';
import ModuleOneMatrix from './ModuleOneMatrix';
import ModuleTwoAnalytics from './ModuleTwoAnalytics'; // 🔥 අලුත් එක Import කළා

export default function DataExportDashboard() {
    const [businesses, setBusinesses] = useState([]);
    const [selectedBusiness, setSelectedBusiness] = useState('');
    const [selectedBatch, setSelectedBatch] = useState('');
    const [hasError, setHasError] = useState(false);
    
    // 🔥 State for Tab Switching 🔥
    const [activeModule, setActiveModule] = useState('module1');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get('/student/available-enrollments', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                let fetchedBiz = [];
                if (res.data && res.data.businesses) {
                    fetchedBiz = res.data.businesses;
                } else if (Array.isArray(res.data)) {
                    fetchedBiz = res.data;
                }
                setBusinesses(fetchedBiz);
                if (fetchedBiz.length === 1) {
                    setSelectedBusiness(fetchedBiz[0].id.toString());
                }
            } catch (error) {
                console.error("Failed to fetch businesses", error);
                setHasError(true);
            }
        };
        fetchData();
    }, []);

    if (hasError) {
        return (
            <div className="flex flex-col justify-center items-center h-full text-rose-400 bg-white/5 rounded-2xl border border-white/10 m-2">
                <AlertTriangle size={48} className="mb-4 opacity-50" />
                <h2 className="text-xl font-bold uppercase tracking-widest">Failed to Load Data</h2>
                <p className="text-xs text-slate-400 mt-2">Please check your internet connection or backend server.</p>
            </div>
        );
    }

    const selectedBizObj = businesses.find(b => String(b.id) === String(selectedBusiness));
    const batches = selectedBizObj && selectedBizObj.batches ? selectedBizObj.batches : [];

    return (
        <div className="flex flex-col gap-6 font-sans text-slate-200 p-2 animate-fade-in h-full">
            
            {/* Top Filter Section */}
            <div className="bg-[#1e293b] p-5 rounded-[2rem] border border-slate-700/50 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20">
                        <Database size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-wider">Campaign Master Analytics</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Select filters to generate reports</p>
                    </div>
                </div>

                {/* 🔥 TAB SWITCHER BUTTONS 🔥 */}
                <div className="hidden lg:flex bg-black/40 p-1.5 rounded-2xl border border-white/5 shadow-inner">
                    <button 
                        onClick={() => setActiveModule('module1')}
                        className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeModule === 'module1' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <LayoutDashboard size={14} /> Module 01: Retention
                    </button>
                    <button 
                        onClick={() => setActiveModule('module2')}
                        className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeModule === 'module2' ? 'bg-purple-500 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <Target size={14} /> Module 02: Drop & Dist.
                    </button>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-2 bg-black/40 border border-slate-700/50 p-2 rounded-2xl w-full md:w-auto shadow-inner">
                        <Filter size={16} className="text-slate-500 ml-2" />
                        
                        {businesses.length > 1 && (
                            <select 
                                value={selectedBusiness} 
                                onChange={(e) => { setSelectedBusiness(e.target.value); setSelectedBatch(''); }}
                                className="bg-transparent text-xs font-bold text-white outline-none py-1.5 px-2 cursor-pointer w-full md:w-48 border-r border-slate-700"
                            >
                                <option value="" className="bg-slate-900">Select Campaign</option>
                                {businesses.map(b => (
                                    <option key={b.id} value={b.id} className="bg-slate-900">{b.name}</option>
                                ))}
                            </select>
                        )}
                        
                        <select 
                            value={selectedBatch} 
                            onChange={(e) => setSelectedBatch(e.target.value)}
                            disabled={!selectedBusiness}
                            className="bg-transparent text-xs font-bold text-white outline-none py-1.5 px-2 cursor-pointer w-full md:w-48 disabled:opacity-50"
                        >
                            <option value="" className="bg-slate-900">Select Batch (All)</option>
                            {batches.map(b => (
                                <option key={b.id} value={b.id} className="bg-slate-900">{b.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Mobile Tab Switcher */}
            <div className="lg:hidden flex bg-black/40 p-1.5 rounded-2xl border border-white/5 shadow-inner">
                <button onClick={() => setActiveModule('module1')} className={`flex-1 flex justify-center items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeModule === 'module1' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>M-01</button>
                <button onClick={() => setActiveModule('module2')} className={`flex-1 flex justify-center items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeModule === 'module2' ? 'bg-purple-500 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>M-02</button>
            </div>

            {/* Dynamic Rendering based on Tab */}
            <div className="flex-1 min-h-0">
                {activeModule === 'module1' ? (
                    <ModuleOneMatrix filters={{ selectedBusiness, selectedBatch }} />
                ) : (
                    <ModuleTwoAnalytics filters={{ selectedBusiness, selectedBatch }} />
                )}
            </div>

        </div>
    );
}