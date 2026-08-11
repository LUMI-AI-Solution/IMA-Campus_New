import os

code = """
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Box, Plus, X, Loader2, ArrowLeft, Building2, Layers, BookOpen, FileText, ChevronRight, AlertTriangle, Edit3, Trash2, BarChart3, Download, Filter, Search } from 'lucide-react';
import axios from '../../../api/axios';
import toast from 'react-hot-toast';

// SMART IMAGE COMPONENT
const LiveTuteImage = ({ stock }) => {
    const [imgSrc, setImgSrc] = useState(null);
    const [errorStage, setErrorStage] = useState(0);

    useEffect(() => {
        let coverName = stock.tuteImage; 
        if (stock.course?.groupPrices && stock.course?.groupId) {
            try {
                const gp = typeof stock.course.groupPrices === 'string' ? JSON.parse(stock.course.groupPrices) : stock.course.groupPrices;
                const match = gp.find(g => parseInt(g.groupId) === parseInt(stock.course.groupId));
                if (match && match.tuteCover && match.tuteCover !== 'default-tute.png' && match.tuteCover !== 'null') {
                    coverName = match.tuteCover;
                }
            } catch(e) {}
        }
        if (!coverName || coverName === 'default-tute.png' || coverName === 'null') {
            setImgSrc(null);
        } else {
            const baseUrl = axios.defaults.baseURL.replace('/api', '');
            setImgSrc(`${baseUrl}/storage/documents/${coverName}`);
        }
    }, [stock]);

    const handleError = () => {
        if (errorStage === 0 && imgSrc) {
            setImgSrc(imgSrc.replace('/storage/documents/', '/storage/images/'));
            setErrorStage(1);
        } else if (errorStage === 1 && imgSrc) {
            setImgSrc(imgSrc.replace('/storage/images/', '/storage/icons/'));
            setErrorStage(2);
        } else {
            setImgSrc(null);
        }
    };

    if (!imgSrc) return <span className="text-[10px] text-gray-500 dark:text-slate-500 font-medium whitespace-nowrap text-center px-1">No Cover</span>;

    return <img src={imgSrc} onError={handleError} alt="Cover" className="w-full h-full object-cover" />;
};

export default function TuteStock({ isReadOnly }) {
    const [viewLevel, setViewLevel] = useState(1);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    
    // Data
    const [globalStock, setGlobalStock] = useState([]);
    const [masterTutes, setMasterTutes] = useState([]);
    
    // Selections
    const [selectedLecturer, setSelectedLecturer] = useState(null);
    const [selectedPaymentGroup, setSelectedPaymentGroup] = useState(null);
    
    // Search & Inputs
    const [lecSearchQuery, setLecSearchQuery] = useState('');
    const [stockInputs, setStockInputs] = useState({});
    
    // Modals
    const [showEditModal, setShowEditModal] = useState(false);
    const [editData, setEditData] = useState({ id: null, qty: '', reason: '' });
    
    const [showLecModal, setShowLecModal] = useState(false);
    const [lecFormData, setLecFormData] = useState({ id: null, name: '', image: null });
    
    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [stockRes, masterRes] = await Promise.all([
                axios.get('/admin/delivery/stock/global'),
                axios.get('/admin/delivery/master-tutes')
            ]);
            setGlobalStock(stockRes.data || []);
            setMasterTutes(masterRes.data || []);
        } catch (error) { 
            toast.error("Failed to load dashboard data"); 
        } finally { 
            setLoading(false); 
        }
    };

    // --- DERIVED DATA ---
    const lecturers = useMemo(() => {
        const lecsMap = new Map();
        
        // Add from globalStock
        globalStock.forEach(s => {
            const lecNameRaw = s.course?.lecturerName || "Unknown Lecturer";
            const lecKey = lecNameRaw.toLowerCase().trim();
            const subName = s.course?.name || "Unknown Subject";
            
            if (!lecsMap.has(lecKey)) {
                let lecImg = null;
                try {
                    const gpArr = typeof s.course?.groupPrices === 'string' ? JSON.parse(s.course.groupPrices) : (s.course?.groupPrices || []);
                    const match = gpArr.find(g => g.groupId == s.course?.groupId);
                    if (match?.lecturerImage) lecImg = match.lecturerImage;
                    else lecImg = gpArr.find(g => g.lecturerImage)?.lecturerImage;
                } catch(e) {}
                
                lecsMap.set(lecKey, { 
                    id: null,
                    name: lecNameRaw, 
                    displayNames: new Set([lecNameRaw]),
                    image: lecImg,
                    subjects: new Set([subName])
                });
            } else {
                lecsMap.get(lecKey).displayNames.add(lecNameRaw);
                lecsMap.get(lecKey).subjects.add(subName);
            }
        });

        // Merge from MasterTutes
        masterTutes.forEach(mt => {
            if(mt.type === 'lecturer') {
                const lecKey = mt.name.toLowerCase().trim();
                if (lecsMap.has(lecKey)) {
                    const existing = lecsMap.get(lecKey);
                    existing.id = mt.id;
                    existing.displayNames.add(mt.name);
                    if (!existing.image || existing.image === 'null' || existing.image === 'default.png') {
                        existing.image = mt.image;
                    }
                } else {
                    lecsMap.set(lecKey, {
                        id: mt.id,
                        name: mt.name,
                        displayNames: new Set([mt.name]),
                        image: mt.image,
                        subjects: new Set()
                    });
                }
            }
        });
        
        return Array.from(lecsMap.values()).map(l => ({
            ...l,
            displayName: Array.from(l.displayNames)[0],
            subjectText: Array.from(l.subjects).join(', ')
        })).sort((a, b) => a.displayName.localeCompare(b.displayName));
    }, [globalStock, masterTutes]);

    const paymentGroups = useMemo(() => {
        if (!selectedLecturer) return [];
        // User requested: Always show Full Payment & Monthly ONLY.
        return [
            { id: 'Full Payment', name: 'Full Payment', icon: <Layers size={24} className="text-emerald-500"/>, bg: 'from-emerald-500/10 to-emerald-500/5', border: 'border-emerald-500/20' },
            { id: 'Monthly', name: 'Monthly', icon: <BookOpen size={24} className="text-blue-500"/>, bg: 'from-blue-500/10 to-blue-500/5', border: 'border-blue-500/20' }
        ];
    }, [selectedLecturer]);

    const finalStocks = useMemo(() => {
        if (!selectedLecturer || !selectedPaymentGroup) return [];
        const lecKey = selectedLecturer.displayName.toLowerCase().trim();
        
        return globalStock.filter(s => {
            const sLecKey = (s.course?.lecturerName || "Unknown Lecturer").toLowerCase().trim();
            const isFull = s.course?.group?.type === 2;
            const isMonthly = s.course?.group?.type === 1;
            
            if (sLecKey !== lecKey) return false;
            
            if (selectedPaymentGroup === 'Full Payment' && isFull) return true;
            if (selectedPaymentGroup === 'Monthly' && isMonthly) return true;
            
            return false;
        });
    }, [globalStock, selectedLecturer, selectedPaymentGroup]);

    // --- ACTIONS ---
    const handleLecSave = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            const fd = new FormData();
            if(lecFormData.id) fd.append('id', lecFormData.id);
            fd.append('name', lecFormData.name);
            fd.append('type', 'lecturer');
            if(lecFormData.image instanceof File) fd.append('image', lecFormData.image);
            
            await axios.post('/admin/delivery/master-tutes/lecturer', fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success("Lecturer saved!");
            setShowLecModal(false);
            fetchInitialData();
        } catch(e) {
            toast.error("Failed to save lecturer");
        } finally {
            setActionLoading(false);
        }
    };

    const handleLecDelete = async (id) => {
        if(!id || !window.confirm("Are you sure you want to delete this lecturer?")) return;
        setActionLoading(true);
        try {
            await axios.delete(`/admin/delivery/master-tutes/lecturer/${id}`);
            toast.success("Lecturer deleted!");
            fetchInitialData();
        } catch(e) {
            toast.error("Failed to delete lecturer");
        } finally {
            setActionLoading(false);
        }
    };

    const handleAddStock = async (stockId) => {
        const qty = parseInt(stockInputs[stockId]);
        if (!qty || isNaN(qty) || qty <= 0) return toast.error("Enter a valid quantity!");
        setActionLoading(true);
        try {
            await axios.post('/admin/delivery/stock/add', { stockId, quantity: qty, reason: "New printed stock added" });
            toast.success("Stock Added!");
            setStockInputs(prev => ({ ...prev, [stockId]: '' }));
            fetchInitialData(); 
        } catch (error) { toast.error("Failed to update stock"); } 
        finally { setActionLoading(false); }
    };

    const handleEditStockSubmit = async (e) => {
        e.preventDefault();
        if (!editData.reason) return toast.error("A reason is required!");
        setActionLoading(true);
        try {
            await axios.put('/admin/delivery/stock/edit', { stockId: editData.id, newQuantity: editData.qty, reason: editData.reason });
            toast.success("Stock Adjusted!");
            setShowEditModal(false);
            fetchInitialData();
        } catch (error) { toast.error("Failed to adjust stock"); } 
        finally { setActionLoading(false); }
    };

    const handleDeleteStock = async (stockId) => {
        const reason = window.prompt("Why are you deleting this item? (Required)");
        if (!reason) return toast.error("Deletion cancelled.");
        try {
            await axios.delete(`/admin/delivery/stock/delete/${stockId}?reason=${encodeURIComponent(reason)}`);
            toast.success("Stock Item Deleted!");
            fetchInitialData();
        } catch (error) { toast.error("Failed to delete item"); }
    };

    // --- RENDER HELPERS ---
    const getLecImage = (imageName) => {
        if (!imageName || imageName === 'null' || imageName === 'default.png') return null;
        const baseUrl = axios.defaults.baseURL.replace('/api', '');
        return `${baseUrl}/storage/images/${imageName}`;
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 bg-[#1e293b] rounded-xl border border-slate-700/50">
                <Loader2 className="animate-spin text-emerald-500 mb-4" size={32} />
                <p className="text-slate-400 font-medium">Loading Inventory Data...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header & Breadcrumbs */}
            <div className="bg-[#1e293b] p-4 rounded-xl border border-slate-700/50 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                    <button 
                        onClick={() => setViewLevel(1)}
                        className={`flex items-center gap-2 ${viewLevel >= 1 ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-300'} transition-colors`}
                    >
                        <Building2 size={16} />
                        <span>Lecturers</span>
                    </button>

                    {viewLevel >= 2 && (
                        <>
                            <ChevronRight size={14} className="text-slate-500" />
                            <button 
                                onClick={() => setViewLevel(2)}
                                className={`flex items-center gap-2 ${viewLevel >= 2 ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-300'} transition-colors`}
                            >
                                <Layers size={16} />
                                <span className="truncate max-w-[150px]">{selectedLecturer?.displayName}</span>
                            </button>
                        </>
                    )}

                    {viewLevel >= 3 && (
                        <>
                            <ChevronRight size={14} className="text-slate-500" />
                            <div className="flex items-center gap-2 text-emerald-400">
                                <BookOpen size={16} />
                                <span className="truncate max-w-[150px]">{selectedPaymentGroup}</span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* LEVEL 1: LECTURERS */}
            {viewLevel === 1 && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center bg-[#1e293b] p-4 rounded-xl border border-slate-700/50">
                        <div className="relative w-full max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search Lecturers..."
                                value={lecSearchQuery}
                                onChange={e => setLecSearchQuery(e.target.value)}
                                className="w-full bg-[#0f172a] text-white pl-10 pr-4 py-2.5 rounded-lg border border-slate-700 focus:border-emerald-500 focus:outline-none transition-colors"
                            />
                        </div>
                        {!isReadOnly && (
                            <button
                                onClick={() => { setLecFormData({ id: null, name: '', image: null }); setShowLecModal(true); }}
                                className="flex items-center gap-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white px-4 py-2.5 rounded-lg font-bold transition-all ml-4"
                            >
                                <Plus size={18} /> Add Lecturer
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {lecturers.filter(l => l.displayName.toLowerCase().includes(lecSearchQuery.toLowerCase())).map((lec, idx) => (
                            <div key={idx} className="group relative bg-[#1e293b] rounded-xl border border-slate-700 hover:border-emerald-500/50 transition-all overflow-hidden cursor-pointer shadow-sm hover:shadow-md" onClick={() => { setSelectedLecturer(lec); setViewLevel(2); }}>
                                <div className="p-5 flex flex-col items-center text-center">
                                    <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-slate-700 group-hover:border-emerald-500/50 mb-4 overflow-hidden shadow-inner flex items-center justify-center">
                                        {lec.image ? (
                                            <img src={getLecImage(lec.image)} alt={lec.displayName} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-2xl font-black text-slate-600">{lec.displayName.substring(0, 2).toUpperCase()}</span>
                                        )}
                                    </div>
                                    <h3 className="text-white font-bold text-lg mb-1">{lec.displayName}</h3>
                                    <p className="text-slate-400 text-xs line-clamp-2">{lec.subjectText}</p>
                                </div>
                                {!isReadOnly && lec.id && (
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={(e) => { e.stopPropagation(); setLecFormData({ id: lec.id, name: lec.displayName, image: null }); setShowLecModal(true); }} className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500 hover:text-white transition-colors">
                                            <Edit3 size={14} />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); handleLecDelete(lec.id); }} className="p-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-colors">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* LEVEL 2: PAYMENT GROUPS */}
            {viewLevel === 2 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
                    {paymentGroups.map((pg, idx) => (
                        <div key={idx} onClick={() => { setSelectedPaymentGroup(pg.id); setViewLevel(3); }} className={`bg-gradient-to-br ${pg.bg} border ${pg.border} p-6 rounded-xl cursor-pointer hover:shadow-lg transition-all group relative overflow-hidden`}>
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/10 rounded-xl shadow-inner backdrop-blur-sm">
                                    {pg.icon}
                                </div>
                                <div>
                                    <h3 className="text-white font-bold text-lg">{pg.name}</h3>
                                    <p className="text-slate-400 text-sm mt-1">View tute stock</p>
                                </div>
                            </div>
                            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-white transition-colors opacity-0 group-hover:opacity-100 group-hover:translate-x-1" size={24} />
                        </div>
                    ))}
                </div>
            )}

            {/* LEVEL 3: STOCKS */}
            {viewLevel === 3 && (
                <div className="bg-[#1e293b] rounded-xl border border-slate-700/50 overflow-hidden shadow-sm">
                    {finalStocks.length === 0 ? (
                        <div className="p-12 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
                                <Box className="text-slate-500" size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">No Tutes Found</h3>
                            <p className="text-slate-400 max-w-md">There is no active tute stock allocated for this lecturer and payment group yet.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead>
                                    <tr className="bg-slate-800/50 border-b border-slate-700">
                                        <th className="px-4 py-3 text-xs font-black text-slate-400 uppercase tracking-wider">Item Details</th>
                                        <th className="px-4 py-3 text-xs font-black text-slate-400 uppercase tracking-wider text-center">Initial</th>
                                        <th className="px-4 py-3 text-xs font-black text-slate-400 uppercase tracking-wider text-center">Packed</th>
                                        <th className="px-4 py-3 text-xs font-black text-slate-400 uppercase tracking-wider text-center">Available</th>
                                        <th className="px-4 py-3 text-xs font-black text-slate-400 uppercase tracking-wider">Status</th>
                                        {!isReadOnly && <th className="px-4 py-3 text-xs font-black text-slate-400 uppercase tracking-wider text-right">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {finalStocks.map((stock) => {
                                        const isLow = stock.availableQuantity <= 10 && stock.availableQuantity > 0;
                                        const isOut = stock.availableQuantity === 0;
                                        
                                        return (
                                            <tr key={stock.id} className="hover:bg-slate-800/20 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-12 rounded bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                                                            <LiveTuteImage stock={stock} />
                                                        </div>
                                                        <div>
                                                            <p className="text-white font-bold text-[13px] line-clamp-1">{stock.tuteName}</p>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-bold">{stock.course?.name}</span>
                                                                <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">ID: {stock.course?.id}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="text-slate-300 font-mono text-sm">{stock.initialQuantity}</span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="text-emerald-400 font-mono text-sm">{stock.deliveredQuantity}</span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`font-mono font-bold text-sm ${isOut ? 'text-red-500' : isLow ? 'text-amber-500' : 'text-emerald-500'}`}>
                                                        {stock.availableQuantity}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {isOut ? (
                                                        <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-400 text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider">
                                                            <AlertTriangle size={12}/> Out of Stock
                                                        </span>
                                                    ) : isLow ? (
                                                        <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-500 text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider">
                                                            <AlertTriangle size={12}/> Low Stock
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider">
                                                            In Stock
                                                        </span>
                                                    )}
                                                </td>
                                                {!isReadOnly && (
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <div className="flex items-center bg-[#0f172a] rounded-lg border border-slate-700 overflow-hidden">
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    placeholder="+Qty"
                                                                    value={stockInputs[stock.id] || ''}
                                                                    onChange={(e) => setStockInputs(prev => ({...prev, [stock.id]: e.target.value}))}
                                                                    className="w-16 bg-transparent text-white text-xs px-2 py-1.5 focus:outline-none text-center font-mono hide-arrows"
                                                                    disabled={actionLoading}
                                                                />
                                                                <button
                                                                    onClick={() => handleAddStock(stock.id)}
                                                                    disabled={actionLoading || !stockInputs[stock.id]}
                                                                    className="bg-emerald-500/20 hover:bg-emerald-500 text-emerald-500 hover:text-white px-2 py-1.5 transition-colors disabled:opacity-50"
                                                                >
                                                                    <Plus size={14} />
                                                                </button>
                                                            </div>
                                                            <button
                                                                onClick={() => { setEditData({ id: stock.id, qty: stock.availableQuantity, reason: '' }); setShowEditModal(true); }}
                                                                className="p-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg transition-colors"
                                                                disabled={actionLoading}
                                                            >
                                                                <Edit3 size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteStock(stock.id)}
                                                                className="p-1.5 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors"
                                                                disabled={actionLoading}
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* MODALS */}
            {showEditModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[#1e293b] w-full max-w-sm rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
                        <div className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-800/50">
                            <h2 className="text-white font-bold flex items-center gap-2"><Edit3 size={18} className="text-blue-500"/> Adjust Stock</h2>
                            <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleEditStockSubmit} className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5">New Available Quantity</label>
                                <input type="number" min="0" required value={editData.qty} onChange={e => setEditData({...editData, qty: e.target.value})} className="w-full bg-[#0f172a] text-white border border-slate-700 rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500 font-mono" />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5">Reason for Adjustment</label>
                                <textarea required value={editData.reason} onChange={e => setEditData({...editData, reason: e.target.value})} className="w-full bg-[#0f172a] text-white border border-slate-700 rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500 resize-none h-20 text-sm" placeholder="e.g., Found extra physical copies, damaged items..."></textarea>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition-colors text-sm">Cancel</button>
                                <button type="submit" disabled={actionLoading} className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors text-sm flex justify-center items-center gap-2">
                                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <><Check size={16} /> Save Changes</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showLecModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[#1e293b] w-full max-w-sm rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
                        <div className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-800/50">
                            <h2 className="text-white font-bold flex items-center gap-2"><Plus size={18} className="text-emerald-500"/> {lecFormData.id ? 'Edit Lecturer' : 'Add Lecturer'}</h2>
                            <button onClick={() => setShowLecModal(false)} className="text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleLecSave} className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5">Lecturer Name</label>
                                <input type="text" required value={lecFormData.name} onChange={e => setLecFormData({...lecFormData, name: e.target.value})} className="w-full bg-[#0f172a] text-white border border-slate-700 rounded-lg px-3 py-2.5 focus:outline-none focus:border-emerald-500 text-sm" placeholder="E.g. Tharindu (Hons)" />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5">Lecturer Photo (Optional)</label>
                                <input type="file" accept="image/*" onChange={e => setLecFormData({...lecFormData, image: e.target.files[0]})} className="w-full bg-[#0f172a] text-white border border-slate-700 rounded-lg px-3 py-2 text-sm file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-emerald-500/20 file:text-emerald-400 hover:file:bg-emerald-500 hover:file:text-white file:transition-colors" />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowLecModal(false)} className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition-colors text-sm">Cancel</button>
                                <button type="submit" disabled={actionLoading} className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition-colors text-sm flex justify-center items-center gap-2">
                                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : 'Save Lecturer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
"""

with open('frontend/src/pages/delivery/components/TuteStock.jsx', 'w') as f:
    f.write(code)

