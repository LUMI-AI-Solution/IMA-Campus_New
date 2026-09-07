import React, { useState, useEffect } from 'react';
import { physicalFinanceService } from '../../api/physicalFinance';
import { Wallet, TrendingUp, TrendingDown, Plus, Trash2, Calendar, Settings, Edit2, Check, X, Tag, Printer, RotateCcw, AlertTriangle, Archive, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import ThermalReceiptModal from '../../components/PhysicalCRM/ThermalReceiptModal';
import { printThermalReceipt } from '../../utils/thermalReceiptPrinter';

const PRESET_DELETE_REASONS = [
    "Duplicate Entry",
    "Wrong Student / Class Selected",
    "Amount Error / Correction",
    "Payment Cancelled / Refunded",
    "Entered in Mistake"
];

export default function CashFlowPortal() {
    const [transactions, setTransactions] = useState([]);
    const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0, netCash: 0 });
    const [loading, setLoading] = useState(false);
    
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

    // Delete Reason Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [txToDelete, setTxToDelete] = useState(null);
    const [deleteReason, setDeleteReason] = useState('');
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Trash Modal State
    const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);
    const [trashList, setTrashList] = useState([]);
    const [trashLoading, setTrashLoading] = useState(false);
    const [trashCount, setTrashCount] = useState(0);

    // Receipt Modal State
    const [receiptModalOpen, setReceiptModalOpen] = useState(false);
    const [selectedReceiptData, setSelectedReceiptData] = useState(null);
    
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
        fetchTrashData();
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

    const fetchTrashData = async () => {
        setTrashLoading(true);
        try {
            const data = await physicalFinanceService.getTrash();
            setTrashList(data.trash || []);
            setTrashCount(data.count || (data.trash ? data.trash.length : 0));
        } catch (err) {
            console.error('Failed to fetch trash', err);
        } finally {
            setTrashLoading(false);
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

    // Open Delete Reason Modal
    const handleInitiateDelete = (tx) => {
        setTxToDelete(tx);
        setDeleteReason('');
        setIsDeleteModalOpen(true);
    };

    // Confirm Delete with Reason
    const handleConfirmDelete = async (e) => {
        e.preventDefault();
        if (!txToDelete) return;
        if (!deleteReason.trim()) {
            toast.error('Please provide a reason for deleting this entry.');
            return;
        }

        setDeleteLoading(true);
        try {
            await physicalFinanceService.deleteTransaction(txToDelete.id, deleteReason.trim(), 'Staff / Manager');
            toast.success('Transaction moved to Trash with deletion reason.');
            setIsDeleteModalOpen(false);
            setTxToDelete(null);
            setDeleteReason('');
            fetchData();
            fetchTrashData();
        } catch (err) {
            toast.error('Failed to delete transaction: ' + (err.response?.data?.error || err.message));
        } finally {
            setDeleteLoading(false);
        }
    };

    // Restore from Trash
    const handleRestore = async (id) => {
        try {
            await physicalFinanceService.restoreTransaction(id);
            toast.success('Transaction restored back to active cash flow!');
            fetchData();
            fetchTrashData();
        } catch (err) {
            toast.error('Failed to restore transaction');
        }
    };

    // Print Receipt for an Income Transaction
    const handlePrintReceipt = (tx) => {
        const receiptObj = {
            receiptNo: `REC-${tx.id}`,
            date: new Date(tx.date || tx.createdAt),
            studentId: tx.student?.studentId || '-',
            studentName: tx.student?.studentName || `${tx.student?.firstName || ''} ${tx.student?.lastName || ''}`.trim() || 'Student',
            studentPhone: tx.student?.phone || '',
            className: tx.description || `${tx.category} Payment`,
            month: '',
            cardType: 'FULL',
            amount: tx.amount,
            paymentMethod: 'CASH',
            cashierName: 'Cashier / Manager',
            items: [
                {
                    description: tx.description || `${tx.category} Payment`,
                    amount: tx.amount
                }
            ],
            totalAmount: tx.amount
        };

        setSelectedReceiptData(receiptObj);
        setReceiptModalOpen(true);
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
                        onClick={() => {
                            fetchTrashData();
                            setIsTrashModalOpen(true);
                        }}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-300 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 border border-red-500/30 shadow-md transition-all text-xs relative"
                        title="View soft-deleted transactions & reasons"
                    >
                        <Archive size={15} className="text-red-400" /> Deleted History (Trash)
                        {trashCount > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow">
                                {trashCount}
                            </span>
                        )}
                    </button>

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
                        {transactions.length} active entries on {selectedDate}
                    </span>
                </div>
                
                <div className="p-6 overflow-auto flex-1 custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div></div>
                    ) : transactions.length === 0 ? (
                        <div className="text-center py-16 text-white/40 font-semibold flex flex-col items-center gap-2">
                            <Wallet size={40} className="opacity-30 mb-2" />
                            <span>No active transactions found for this date.</span>
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
                                            {t.description?.includes('[HALF CARD]') && (
                                                <div className="mt-1">
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/40 shadow-sm">
                                                        🏷️ HALF CARD (50% Concession)
                                                    </span>
                                                </div>
                                            )}
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
                                            <div className="flex items-center justify-center gap-1.5">
                                                {t.type === 'INCOME' && (
                                                    <button 
                                                        onClick={() => handlePrintReceipt(t)} 
                                                        className="text-blue-400 hover:text-blue-300 p-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg transition-all"
                                                        title="Print 80mm Thermal Receipt (Xprinter)"
                                                    >
                                                        <Printer size={15} />
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => handleInitiateDelete(t)} 
                                                    className="text-white/30 hover:text-red-400 transition-colors p-2 bg-white/5 rounded-lg hover:bg-white/10"
                                                    title="Delete transaction (Require reason & move to Trash)"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
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

            {/* DELETE TRANSACTION REASON MODAL */}
            {isDeleteModalOpen && txToDelete && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex justify-center items-center p-4">
                    <div className="bg-[#171827] border border-red-500/30 p-6 rounded-3xl w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in duration-200 text-white">
                        <button 
                            onClick={() => { setIsDeleteModalOpen(false); setTxToDelete(null); }} 
                            className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors bg-white/5 p-2 rounded-xl"
                        >
                            <X size={18} />
                        </button>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30">
                                <Trash2 size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">Delete Transaction</h3>
                                <p className="text-xs text-white/50">Provide a mandatory reason before moving to Trash.</p>
                            </div>
                        </div>

                        {/* Transaction Summary Card */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 mb-4 text-xs space-y-1">
                            <div className="flex justify-between">
                                <span className="text-white/50">Category & Type:</span>
                                <span className="font-bold text-white">{txToDelete.category} ({txToDelete.type})</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-white/50">Amount:</span>
                                <span className="font-black text-emerald-400">Rs. {txToDelete.amount.toLocaleString()}</span>
                            </div>
                            {txToDelete.description && (
                                <div className="flex justify-between">
                                    <span className="text-white/50">Description:</span>
                                    <span className="text-white/80 font-medium truncate max-w-[200px]">{txToDelete.description}</span>
                                </div>
                            )}
                            {txToDelete.student && (
                                <div className="flex justify-between">
                                    <span className="text-white/50">Student:</span>
                                    <span className="text-blue-400 font-bold">
                                        {txToDelete.student.studentName || txToDelete.student.firstName} ({txToDelete.student.studentId})
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Preset Reasons */}
                        <div className="mb-3">
                            <label className="block text-[10px] font-bold text-white/60 uppercase tracking-wider mb-1.5">Quick Reason Select</label>
                            <div className="flex flex-wrap gap-1.5">
                                {PRESET_DELETE_REASONS.map((preset, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setDeleteReason(preset)}
                                        className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                                            deleteReason === preset 
                                                ? 'bg-red-500/20 text-red-300 border-red-500/50 font-bold' 
                                                : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                                        }`}
                                    >
                                        {preset}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Reason Form */}
                        <form onSubmit={handleConfirmDelete} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-white/60 uppercase tracking-wider mb-1">
                                    Reason for Deletion *
                                </label>
                                <textarea
                                    required
                                    rows={3}
                                    value={deleteReason}
                                    onChange={(e) => setDeleteReason(e.target.value)}
                                    placeholder="Explain why this entry is being deleted (e.g. Duplicate entry, amount entered incorrectly)..."
                                    className="w-full bg-black/50 border border-white/15 rounded-xl p-3 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                                />
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setIsDeleteModalOpen(false); setTxToDelete(null); }}
                                    className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={deleteLoading || !deleteReason.trim()}
                                    className="flex-1 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-2"
                                >
                                    {deleteLoading ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <Trash2 size={14} /> Move to Trash
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* TRASH / DELETED HISTORY MODAL */}
            {isTrashModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex justify-center items-center p-4">
                    <div className="bg-[#151624] border border-white/20 p-6 rounded-3xl w-full max-w-4xl max-h-[85vh] shadow-2xl relative animate-in fade-in zoom-in duration-200 text-white flex flex-col">
                        <button 
                            onClick={() => setIsTrashModalOpen(false)} 
                            className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors bg-white/5 p-2 rounded-xl"
                        >
                            <X size={18} />
                        </button>

                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30">
                                    <Archive size={20} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold">Deleted Transactions (Trash)</h3>
                                    <p className="text-xs text-white/50">Audit log of deleted transactions with deletion reasons and restore capability.</p>
                                </div>
                            </div>
                            <span className="bg-red-500/20 text-red-300 border border-red-500/30 px-3 py-1 rounded-full text-xs font-bold mr-8">
                                {trashList.length} deleted records
                            </span>
                        </div>

                        {/* Trash List Table */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {trashLoading ? (
                                <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin"></div></div>
                            ) : trashList.length === 0 ? (
                                <div className="text-center py-16 text-white/40 flex flex-col items-center gap-2">
                                    <Archive size={40} className="opacity-30 mb-2" />
                                    <span>Trash is empty. No deleted transactions found.</span>
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="border-b border-white/10 text-white/50 uppercase tracking-wider">
                                            <th className="pb-3 font-semibold">Type</th>
                                            <th className="pb-3 font-semibold">Category</th>
                                            <th className="pb-3 font-semibold">Details / Student</th>
                                            <th className="pb-3 font-semibold text-right">Amount</th>
                                            <th className="pb-3 font-semibold pl-4">Reason for Deletion</th>
                                            <th className="pb-3 font-semibold">Deleted At</th>
                                            <th className="pb-3 font-semibold text-center">Restore</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {trashList.map((item) => (
                                            <tr key={item.id} className="hover:bg-white/5 transition-colors">
                                                <td className="py-3">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.type === 'INCOME' ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}>
                                                        {item.type}
                                                    </span>
                                                </td>
                                                <td className="py-3 font-bold text-white/90">{item.category}</td>
                                                <td className="py-3">
                                                    <div className="text-white/80 font-medium">{item.description || '-'}</div>
                                                    {item.student && (
                                                        <div className="text-[11px] text-blue-400 font-semibold">
                                                            🎓 {item.student.studentName || item.student.firstName} ({item.student.studentId})
                                                        </div>
                                                    )}
                                                </td>
                                                <td className={`py-3 text-right font-black ${item.type === 'INCOME' ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    Rs. {item.amount.toLocaleString()}
                                                </td>
                                                <td className="py-3 pl-4">
                                                    <div className="bg-red-500/15 border border-red-500/30 text-red-200 px-2.5 py-1 rounded-lg text-[11px] inline-block font-medium">
                                                        ⚠️ {item.deletedReason || 'No reason specified'}
                                                    </div>
                                                </td>
                                                <td className="py-3 text-white/50 text-[11px]">
                                                    <div>{item.deletedAt ? new Date(item.deletedAt).toLocaleDateString() : '-'}</div>
                                                    <div className="text-[10px] text-white/40">{item.deletedAt ? new Date(item.deletedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</div>
                                                </td>
                                                <td className="py-3 text-center">
                                                    <button
                                                        onClick={() => handleRestore(item.id)}
                                                        className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl font-bold transition-all flex items-center gap-1 mx-auto text-xs shadow"
                                                        title="Restore to active Cash Flow"
                                                    >
                                                        <RotateCcw size={12} /> Restore
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-white/10 flex justify-end">
                            <button 
                                onClick={() => setIsTrashModalOpen(false)}
                                className="px-5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all"
                            >
                                Close
                            </button>
                        </div>
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

            {/* Thermal Receipt Preview Modal */}
            <ThermalReceiptModal
                isOpen={receiptModalOpen}
                onClose={() => setReceiptModalOpen(false)}
                receiptData={selectedReceiptData}
                autoPrint={false}
            />

        </div>
    );
}
