import React from 'react';
import { Search, Users, Activity, CheckCircle, Clock, XCircle, Gift, Tag, Download } from 'lucide-react';

export default function PaymentFilters({ 
    isAdmin, filters, setFilters, businesses, batches, groups, subjects, stats, onOpenStaffStats, onOpenExport 
}) {
    const handleChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="mb-8 font-sans transition-all duration-300">
            {/* Top Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
                <div className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl flex flex-col justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] hover:shadow-[0_0_20px_rgba(234,179,8,0.12)] hover:border-yellow-500/30 hover:-translate-y-1 transition-all duration-300">
                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-2"><Clock size={14} className="text-yellow-500"/> Pending</p>
                    <h3 className="text-3xl font-black text-white">{stats.pending}</h3>
                </div>
                <div className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl flex flex-col justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] hover:shadow-[0_0_20px_rgba(16,185,129,0.12)] hover:border-emerald-500/30 hover:-translate-y-1 transition-all duration-300">
                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-2"><CheckCircle size={14} className="text-emerald-400"/> Approved</p>
                    <h3 className="text-3xl font-black text-white">{stats.approved}</h3>
                </div>
                <div className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl flex flex-col justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] hover:shadow-[0_0_20px_rgba(250,204,21,0.12)] hover:border-yellow-400/30 hover:-translate-y-1 transition-all duration-300">
                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-2"><Gift size={14} className="text-yellow-400"/> Free Cards</p>
                    <h3 className="text-3xl font-black text-white">{stats.freeCards}</h3>
                </div>
                <div className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl flex flex-col justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] hover:shadow-[0_0_20px_rgba(59,130,246,0.12)] hover:border-blue-400/30 hover:-translate-y-1 transition-all duration-300">
                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-2"><Tag size={14} className="text-blue-400"/> Discounts</p>
                    <h3 className="text-3xl font-black text-white">{stats.discounts}</h3>
                </div>
                <div className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl flex flex-col justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] cursor-pointer hover:bg-white/10 hover:shadow-[0_0_20px_rgba(168,85,247,0.12)] hover:border-purple-500/30 hover:-translate-y-1 transition-all duration-300" onClick={onOpenStaffStats}>
                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-2"><Users size={14} className="text-purple-400"/> Staff Stats</p>
                    <h3 className="text-sm font-extrabold text-purple-400 mt-1 uppercase tracking-widest">Click to View</h3>
                </div>
                
                {/* Export Button (Dynamic Themed) */}
                <div className="bg-emerald-500/10 backdrop-blur-md border border-emerald-500/20 p-5 rounded-2xl flex flex-col justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] cursor-pointer hover:bg-emerald-500/20 hover:shadow-[0_0_20px_rgba(16,185,129,0.18)] hover:border-emerald-500/40 hover:-translate-y-1 transition-all duration-300 group" onClick={onOpenExport}>
                    <p className="text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-2 group-hover:text-emerald-300 transition-colors">
                        <Download size={14} className="text-emerald-400 group-hover:text-emerald-300 transition-colors"/> Export
                    </p>
                    <h3 className="text-sm font-extrabold text-emerald-400 mt-1 uppercase tracking-widest group-hover:text-emerald-300 transition-colors">Generate Report</h3>
                </div>
            </div>

            {/* Main Filters Bar */}
            <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl space-y-5 transition-all duration-300">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors" size={18}/>
                        <input 
                            type="text" 
                            placeholder="Search by Student Name or No..." 
                            value={filters.search} 
                            onChange={e => handleChange('search', e.target.value)} 
                            className="w-full bg-slate-900/60 dark:bg-slate-950/40 border border-white/10 focus:border-brand-accent/50 focus:ring-1 focus:ring-brand-accent/30 rounded-xl pl-11 pr-4 py-3 text-slate-100 placeholder-slate-500 font-medium outline-none transition-all duration-200 shadow-inner text-sm" 
                        />
                    </div>
                    
                    {isAdmin && (
                        <select 
                            value={filters.businessId} 
                            onChange={e => handleChange('businessId', e.target.value)} 
                            className="bg-slate-900/60 hover:bg-slate-900/80 dark:bg-slate-950/40 dark:hover:bg-slate-950/60 border border-white/10 hover:border-white/20 rounded-xl px-4 py-3 text-sm font-bold text-slate-200 outline-none focus:border-brand-accent/50 cursor-pointer min-w-[150px] transition-all duration-200 shadow-sm"
                        >
                            <option value="All" className="bg-slate-900 text-white">All Businesses</option>
                            {businesses.map(biz => <option key={biz.id} value={biz.id} className="bg-slate-900 text-white">{biz.name}</option>)}
                        </select>
                    )}
                    
                    <select 
                        value={filters.batchId} 
                        onChange={e => handleChange('batchId', e.target.value)} 
                        className="bg-slate-900/60 hover:bg-slate-900/80 dark:bg-slate-950/40 dark:hover:bg-slate-950/60 border border-white/10 hover:border-white/20 rounded-xl px-4 py-3 text-sm font-bold text-slate-200 outline-none focus:border-brand-accent/50 cursor-pointer min-w-[140px] transition-all duration-200 shadow-sm"
                    >
                        <option value="All" className="bg-slate-900 text-white">All Batches</option>
                        {batches.map(b => <option key={b.id} value={b.id} className="bg-slate-900 text-white">{b.name}</option>)}
                    </select>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                    <select 
                        value={filters.groupId} 
                        onChange={e => handleChange('groupId', e.target.value)} 
                        className="flex-1 bg-slate-900/60 hover:bg-slate-900/80 dark:bg-slate-950/40 dark:hover:bg-slate-950/60 border border-white/10 hover:border-white/20 rounded-xl px-4 py-3 text-sm font-bold text-slate-200 outline-none focus:border-brand-accent/50 cursor-pointer transition-all duration-200 shadow-sm"
                    >
                        <option value="All" className="bg-slate-900 text-white">All Groups</option>
                        {groups.map(g => <option key={g.id} value={g.id} className="bg-slate-900 text-white">{g.name}</option>)}
                    </select>

                    <select 
                        value={filters.subjectId} 
                        onChange={e => handleChange('subjectId', e.target.value)} 
                        className="flex-1 bg-slate-900/60 hover:bg-slate-900/80 dark:bg-slate-950/40 dark:hover:bg-slate-950/60 border border-white/10 hover:border-white/20 rounded-xl px-4 py-3 text-sm font-bold text-slate-200 outline-none focus:border-brand-accent/50 cursor-pointer transition-all duration-200 shadow-sm"
                    >
                        <option value="All" className="bg-slate-900 text-white">All Subjects</option>
                        {subjects.map(s => <option key={s.id} value={s.id} className="bg-slate-900 text-white">{s.name} ({s.code})</option>)}
                    </select>

                    <select 
                        value={filters.method} 
                        onChange={e => handleChange('method', e.target.value)} 
                        className="flex-1 bg-slate-900/60 hover:bg-slate-900/80 dark:bg-slate-950/40 dark:hover:bg-slate-950/60 border border-white/10 hover:border-white/20 rounded-xl px-4 py-3 text-sm font-bold text-slate-200 outline-none focus:border-brand-accent/50 cursor-pointer transition-all duration-200 shadow-sm"
                    >
                        <option value="All" className="bg-slate-900 text-white">All Methods (Slip & Online)</option>
                        <option value="Slip" className="bg-slate-900 text-white">Slip Payments</option>
                        <option value="Online" className="bg-slate-900 text-white">Online Payments</option>
                    </select>
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-center bg-white/5 backdrop-blur-md p-4 rounded-xl border border-white/10 shadow-inner transition-all duration-300 w-full">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Activity size={14}/> Date Range:</span>
                    
                    <input 
                        type="date" 
                        value={filters.dateFrom} 
                        onChange={e => handleChange('dateFrom', e.target.value)} 
                        className="bg-slate-900/60 dark:bg-slate-950/40 border border-white/10 focus:border-brand-accent/50 rounded-xl px-4 py-2 text-sm font-semibold text-slate-200 outline-none transition-all duration-200 [color-scheme:dark] shadow-sm" 
                    />
                    
                    <span className="text-slate-500 font-bold">To</span>
                    
                    <input 
                        type="date" 
                        value={filters.dateTo} 
                        onChange={e => handleChange('dateTo', e.target.value)} 
                        className="bg-slate-900/60 dark:bg-slate-950/40 border border-white/10 focus:border-brand-accent/50 rounded-xl px-4 py-2 text-sm font-semibold text-slate-200 outline-none transition-all duration-200 [color-scheme:dark] shadow-sm" 
                    />
                    
                    <button 
                        onClick={() => {handleChange('dateFrom', ''); handleChange('dateTo', '');}} 
                        className="text-xs font-extrabold text-rose-400 hover:text-rose-300 hover:scale-[1.03] transition-all duration-200 ml-auto bg-rose-500/10 hover:bg-rose-500/20 px-3.5 py-2 rounded-xl border border-rose-500/20 shadow-sm"
                    >
                        Clear Dates
                    </button>
                </div>
            </div>
        </div>
    );
}