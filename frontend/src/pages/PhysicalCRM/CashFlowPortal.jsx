import React, { useState, useEffect } from 'react';
import { physicalFinanceService } from '../../api/physicalFinance';
import { Wallet, TrendingUp, TrendingDown, Plus, Trash2, Calendar, Settings, Edit2, Check, X, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function CashFlowPortal() {
    const [transactions, setTransactions] = useState([]);
    const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0, netCash: 0 });
    const [loading, setLoading] = useState(false);
    
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    
    // Categories State
    const [categories, setCategories] = useState([]);
    const [catLoading, setCatLoading] = useState(false);
    const [newCatName, setNewCatName] = useState('');
    const [newCatType, setNewCatType] = useState('EXPENSE');
    const [editingCatId, setEditingCatId] = useState(null);
    const [editingCatName, setEditingCatName] = useState('');

    const [formData, setFormData] = useState({
        type: 'INCOME',
        category: '',
        amount: '',
        description: ''
    });

    useEffect(() => {
        fetchData();
        fetchCategories();
    }, [selectedDate]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await physicalFinanceService.getTransactions(selectedDate);
            setTransactions(data.transactions || []);
            setSummary(data.summary || { totalIncome: 0, totalExpense: 0, netCash: 0 });
        } catch (err) {
            toast.error('Failed to load cash flow data');
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        setCatLoading(true);
        try {
            const data = await physicalFinanceService.getCategories();
            const safeCategories = Array.isArray(data) ? data : [];
            setCategories(safeCategories);
            
            // Set default category for form if empty
            if (safeCategories.length > 0 && !formData.category) {
                const defaultCat = safeCategories.find(c => c.type === formData.type);
                if (defaultCat) {
                    setFormData(prev => ({ ...prev, category: defaultCat.name }));
                }
            }
        } catch (err) {
            console.error('Failed to load categories', err);
            setCategories([]);
        } finally {
            setCatLoading(false);
        }
    };

    // Filter categories by form type
    const safeCategoriesList = Array.isArray(categories) ? categories : [];
    const activeTypeCategories = safeCategoriesList.filter(c => c.type === formData.type);

    const handleTypeChange = (newType) => {
        const available = safeCategoriesList.filter(c => c.type === newType);
        setFormData({
            ...formData,
            type: newType,
            category: available.length > 0 ? available[0].name : ''
        });
    };

    const handleAddTransaction = async (e) => {
        e.preventDefault();
        if (!formData.category) {
            toast.error('Please select or add a category');
            return;
        }
        try {
            await physicalFinanceService.addTransaction(formData);
            toast.success('Transaction added successfully!');
            setIsAddModalOpen(false);
            setFormData({ type: 'INCOME', category: '', amount: '', description: '' });
            fetchData();
        } catch (err) {
            toast.error('Failed to add transaction: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this transaction?')) return;
        try {
            await physicalFinanceService.deleteTransaction(id);
            toast.success('Transaction deleted');
            fetchData();
        } catch (err) {
            toast.error('Failed to delete transaction');
        }
    };

    // --- Category Management Handlers ---
    const handleAddCategory = async (e) => {
        e.preventDefault();
        if (!newCatName.trim()) {
            toast.error('Category name is required');
            return;
        }
        try {
            await physicalFinanceService.addCategory({ name: newCatName.trim(), type: newCatType });
            toast.success(`Category "${newCatName}" added!`);
            setNewCatName('');
            fetchCategories();
        } catch (err) {
            toast.error('Failed to add category: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleUpdateCategory = async (id) => {
        if (!editingCatName.trim()) {
            toast.error('Category name cannot be empty');
            return;
        }
        try {
            await physicalFinanceService.updateCategory(id, { name: editingCatName.trim() });
            toast.success('Category updated!');
            setEditingCatId(null);
            fetchCategories();
            fetchData(); // In case historical transactions were updated
        } catch (err) {
            toast.error('Failed to update category');
        }
    };

    const handleDeleteCategory = async (id, name) => {
        if (!window.confirm(`Delete category "${name}"? Existing transactions will keep their history.`)) return;
        try {
            await physicalFinanceService.deleteCategory(id);
            toast.success('Category deleted');
            fetchCategories();
        } catch (err) {
            toast.error('Failed to delete category');
        }
    };

    return (
        <div className="p-4 md:p-6 h-full flex flex-col gap-6 animate-fade-in text-white relative">
            
            {/* Header & Date Picker */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-black/40 backdrop-blur-xl border border-white/20 p-6 rounded-[2rem] shadow-lg">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2 drop-shadow-md">
                        <Wallet className="text-emerald-400" /> Cash Flow Dashboard
                    </h2>
                    <p className="text-white/60 text-sm mt-1">Manage daily physical campus income, expenses, and fee collections.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <button 
                        onClick={() => setIsCategoryModalOpen(true)}
                        className="bg-white/10 hover:bg-white/20 text-white/90 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 border border-white/15 shadow-md transition-all text-xs"
                    >
                        <Settings size={15} className="text-blue-400" /> Manage Categories
                    </button>

                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
                        <Calendar size={18} className="text-blue-400" />
                        <input 
                            type="date" 
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-transparent outline-none text-white font-bold text-sm"
                        />
                    </div>
                    
                    <button 
                        onClick={() => {
                            // Ensure default category is selected
                            const available = categories.filter(c => c.type === formData.type);
                            if (available.length > 0 && !formData.category) {
                                setFormData(prev => ({ ...prev, category: available[0].name }));
                            }
                            setIsAddModalOpen(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5 text-sm"
                    >
                        <Plus size={18} /> Add Entry
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-6 rounded-3xl flex flex-col justify-center relative overflow-hidden shadow-[0_4px_20px_rgba(16,185,129,0.15)]">
                    <div className="absolute -right-4 -bottom-4 text-emerald-500/10"><TrendingUp size={120} /></div>
                    <p className="text-emerald-400 text-sm font-bold uppercase tracking-wider mb-2 relative z-10">Total Income</p>
                    <h3 className="text-4xl font-black text-white relative z-10 drop-shadow-md">Rs. {summary.totalIncome.toLocaleString()}</h3>
                </div>

                <div className="bg-red-500/10 border border-red-500/30 p-6 rounded-3xl flex flex-col justify-center relative overflow-hidden shadow-[0_4px_20px_rgba(239,68,68,0.15)]">
                    <div className="absolute -right-4 -bottom-4 text-red-500/10"><TrendingDown size={120} /></div>
                    <p className="text-red-400 text-sm font-bold uppercase tracking-wider mb-2 relative z-10">Total Expenses</p>
                    <h3 className="text-4xl font-black text-white relative z-10 drop-shadow-md">Rs. {summary.totalExpense.toLocaleString()}</h3>
                </div>

                <div className={`p-6 rounded-3xl flex flex-col justify-center relative overflow-hidden shadow-[0_8px_30px_rgba(59,130,246,0.4)] border ${summary.netCash >= 0 ? 'bg-gradient-to-tr from-blue-600 to-blue-400 border-blue-400/50' : 'bg-gradient-to-tr from-rose-700 to-rose-500 border-rose-400/50'}`}>
                    <div className="absolute -right-4 -bottom-4 text-white/10"><Wallet size={120} /></div>
                    <p className="text-blue-100 text-sm font-bold uppercase tracking-wider mb-2 relative z-10">Cash In Hand (Net)</p>
                    <h3 className="text-5xl font-black text-white relative z-10 drop-shadow-lg">Rs. {summary.netCash.toLocaleString()}</h3>
                </div>
            </div>

            {/* Transaction List */}
            <div className="bg-black/40 backdrop-blur-xl border border-white/20 rounded-[2rem] shadow-lg flex-1 overflow-hidden flex flex-col min-h-[400px]">
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                    <h3 className="text-xl font-bold">Transaction History</h3>
                    <span className="text-xs text-white/50 bg-white/5 px-3 py-1 rounded-full border border-white/10 font-bold">
                        {transactions.length} entries on {selectedDate}
                    </span>
                </div>
                
                <div className="p-6 overflow-auto flex-1 custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div></div>
                    ) : transactions.length === 0 ? (
                        <div className="text-center py-16 text-white/40 font-semibold flex flex-col items-center gap-2">
                            <Wallet size={40} className="opacity-30 mb-2" />
                            <span>No transactions found for this date.</span>
                            <span className="text-xs text-white/30">Click "Add Entry" to record daily income or expenses.</span>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/10 text-white/50 text-xs uppercase tracking-wider">
                                    <th className="pb-3 font-semibold">Type</th>
                                    <th className="pb-3 font-semibold">Category</th>
                                    <th className="pb-3 font-semibold">Description / Student</th>
                                    <th className="pb-3 font-semibold text-right">Amount (Rs)</th>
                                    <th className="pb-3 font-semibold text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {transactions.map((t) => (
                                    <tr key={t.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="py-4">
                                            {t.type === 'INCOME' ? (
                                                <span className="text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md text-xs font-bold border border-emerald-500/20">INCOME</span>
                                            ) : (
                                                <span className="text-red-400 bg-red-500/10 px-2.5 py-1 rounded-md text-xs font-bold border border-red-500/20">EXPENSE</span>
                                            )}
                                        </td>
                                        <td className="py-4">
                                            <span className="font-bold text-white/90 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 text-xs">
                                                {t.category}
                                            </span>
                                        </td>
                                        <td className="py-4">
                                            <div className="font-medium text-white/90">{t.description || '-'}</div>
                                            {t.student && (
                                                <div className="text-xs text-blue-400 font-semibold mt-0.5">
                                                    🎓 {t.student.studentName || `${t.student.firstName || ''} ${t.student.lastName || ''}`.trim()} ({t.student.studentId})
                                                </div>
                                            )}
                                        </td>
                                        <td className={`py-4 text-right font-black text-base ${t.type === 'INCOME' ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {t.type === 'INCOME' ? '+' : '-'}{t.amount.toLocaleString()}
                                        </td>
                                        <td className="py-4 text-center">
                                            <button 
                                                onClick={() => handleDelete(t.id)} 
                                                className="text-white/30 hover:text-red-400 transition-colors p-2 bg-white/5 rounded-lg hover:bg-white/10"
                                                title="Delete transaction"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Add Transaction Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-center items-center p-4">
                    <div className="bg-[#151522] border border-white/20 p-6 rounded-3xl w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in duration-200">
                        <button onClick={() => setIsAddModalOpen(false)} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors bg-white/5 p-2 rounded-xl">
                            <X size={18} />
                        </button>
                        
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                            <Plus size={22} className="text-blue-400" /> Add Transaction
                        </h2>
                        
                        <form onSubmit={handleAddTransaction} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1">Type</label>
                                    <select 
                                        value={formData.type}
                                        onChange={(e) => handleTypeChange(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 appearance-none font-bold text-sm shadow-inner"
                                    >
                                        <option value="INCOME" className="text-black">INCOME</option>
                                        <option value="EXPENSE" className="text-black">EXPENSE</option>
                                    </select>
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider">Category</label>
                                        <button 
                                            type="button" 
                                            onClick={() => setIsCategoryModalOpen(true)}
                                            className="text-[10px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-0.5"
                                        >
                                            <Settings size={10} /> Edit
                                        </button>
                                    </div>
                                    <select 
                                        required
                                        value={formData.category}
                                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 appearance-none font-bold text-sm shadow-inner"
                                    >
                                        {activeTypeCategories.map(cat => (
                                            <option key={cat.id} value={cat.name} className="text-black">{cat.name}</option>
                                        ))}
                                        {activeTypeCategories.length === 0 && (
                                            <option value="" className="text-black">No categories. Click Edit to add.</option>
                                        )}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1">Amount (Rs) *</label>
                                <input 
                                    type="number" 
                                    required 
                                    step="any"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-lg font-bold shadow-inner"
                                    placeholder="0.00"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1">Description / Note</label>
                                <textarea 
                                    value={formData.description}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/40 min-h-[80px] shadow-inner text-sm"
                                    placeholder="Optional details (e.g. Electric bill, Classroom stationery, etc.)..."
                                ></textarea>
                            </div>

                            <button type="submit" className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-all text-sm tracking-wide mt-2">
                                Save Transaction Entry
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* CATEGORIES MANAGEMENT MODAL */}
            {isCategoryModalOpen && (
                <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex justify-center items-center p-4">
                    <div className="bg-[#151522] border border-white/20 p-6 rounded-3xl w-full max-w-lg shadow-2xl relative animate-in fade-in zoom-in duration-200 text-white">
                        <button onClick={() => setIsCategoryModalOpen(false)} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors bg-white/5 p-2 rounded-xl">
                            <X size={18} />
                        </button>

                        <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                            <Tag size={20} className="text-blue-400" /> Manage Finance Categories
                        </h2>
                        <p className="text-xs text-white/50 mb-5">Add new categories or edit/delete existing categories for income and expenses.</p>

                        {/* Add Category Form */}
                        <form onSubmit={handleAddCategory} className="bg-white/5 p-4 rounded-2xl border border-white/10 mb-6 space-y-3">
                            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">Add New Category</span>
                            <div className="flex gap-2">
                                <select 
                                    value={newCatType}
                                    onChange={(e) => setNewCatType(e.target.value)}
                                    className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none"
                                >
                                    <option value="EXPENSE" className="text-black">EXPENSE</option>
                                    <option value="INCOME" className="text-black">INCOME</option>
                                </select>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Hall Rent, Water Bill, Lab Items"
                                    value={newCatName}
                                    onChange={(e) => setNewCatName(e.target.value)}
                                    className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none"
                                />
                                <button 
                                    type="submit" 
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 shadow-md shadow-blue-500/20"
                                >
                                    <Plus size={14} /> Add
                                </button>
                            </div>
                        </form>

                        {/* Categories Lists */}
                        <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                            
                            {/* Expense Categories */}
                            <div>
                                <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <TrendingDown size={14} /> Expense Categories ({categories.filter(c => c.type === 'EXPENSE').length})
                                </h4>
                                <div className="space-y-1.5">
                                    {categories.filter(c => c.type === 'EXPENSE').map(cat => (
                                        <div key={cat.id} className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/5 hover:border-white/15 transition-all text-xs">
                                            {editingCatId === cat.id ? (
                                                <div className="flex items-center gap-2 flex-1 mr-2">
                                                    <input 
                                                        type="text" 
                                                        value={editingCatName} 
                                                        onChange={(e) => setEditingCatName(e.target.value)}
                                                        className="flex-1 bg-black/60 border border-blue-400 rounded-lg px-2.5 py-1 text-xs text-white outline-none font-semibold"
                                                        autoFocus
                                                    />
                                                    <button onClick={() => handleUpdateCategory(cat.id)} className="p-1 text-emerald-400 hover:bg-emerald-500/20 rounded"><Check size={14} /></button>
                                                    <button onClick={() => setEditingCatId(null)} className="p-1 text-white/50 hover:bg-white/10 rounded"><X size={14} /></button>
                                                </div>
                                            ) : (
                                                <span className="font-semibold text-white/90">{cat.name}</span>
                                            )}

                                            {editingCatId !== cat.id && (
                                                <div className="flex items-center gap-1">
                                                    <button 
                                                        onClick={() => { setEditingCatId(cat.id); setEditingCatName(cat.name); }} 
                                                        className="p-1 text-white/40 hover:text-blue-400 hover:bg-white/10 rounded transition-colors"
                                                        title="Rename category"
                                                    >
                                                        <Edit2 size={13} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteCategory(cat.id, cat.name)} 
                                                        className="p-1 text-white/40 hover:text-red-400 hover:bg-white/10 rounded transition-colors"
                                                        title="Delete category"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Income Categories */}
                            <div className="pt-2 border-t border-white/10">
                                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <TrendingUp size={14} /> Income Categories ({categories.filter(c => c.type === 'INCOME').length})
                                </h4>
                                <div className="space-y-1.5">
                                    {categories.filter(c => c.type === 'INCOME').map(cat => (
                                        <div key={cat.id} className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/5 hover:border-white/15 transition-all text-xs">
                                            {editingCatId === cat.id ? (
                                                <div className="flex items-center gap-2 flex-1 mr-2">
                                                    <input 
                                                        type="text" 
                                                        value={editingCatName} 
                                                        onChange={(e) => setEditingCatName(e.target.value)}
                                                        className="flex-1 bg-black/60 border border-blue-400 rounded-lg px-2.5 py-1 text-xs text-white outline-none font-semibold"
                                                        autoFocus
                                                    />
                                                    <button onClick={() => handleUpdateCategory(cat.id)} className="p-1 text-emerald-400 hover:bg-emerald-500/20 rounded"><Check size={14} /></button>
                                                    <button onClick={() => setEditingCatId(null)} className="p-1 text-white/50 hover:bg-white/10 rounded"><X size={14} /></button>
                                                </div>
                                            ) : (
                                                <span className="font-semibold text-white/90">{cat.name}</span>
                                            )}

                                            {editingCatId !== cat.id && (
                                                <div className="flex items-center gap-1">
                                                    <button 
                                                        onClick={() => { setEditingCatId(cat.id); setEditingCatName(cat.name); }} 
                                                        className="p-1 text-white/40 hover:text-blue-400 hover:bg-white/10 rounded transition-colors"
                                                        title="Rename category"
                                                    >
                                                        <Edit2 size={13} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteCategory(cat.id, cat.name)} 
                                                        className="p-1 text-white/40 hover:text-red-400 hover:bg-white/10 rounded transition-colors"
                                                        title="Delete category"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>

                        <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
                            <button 
                                onClick={() => setIsCategoryModalOpen(false)}
                                className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
