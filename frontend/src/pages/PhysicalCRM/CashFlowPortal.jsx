import React, { useState, useEffect } from 'react';
import { physicalFinanceService } from '../../api/physicalFinance';
import { Wallet, TrendingUp, TrendingDown, Plus, Trash2, Calendar, Settings, Edit2, Check, X, Tag, Printer, RotateCcw, AlertTriangle, Archive, FileText, Search, Coins } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import ThermalReceiptModal from '../../components/PhysicalCRM/ThermalReceiptModal';
import DailyCashFlowPrintModal from '../../components/PhysicalCRM/DailyCashFlowPrintModal';
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
    const [searchQuery, setSearchQuery] = useState('');
    const [summary, setSummary] = useState({ 
        totalIncome: 0, 
        totalExpense: 0, 
        dayNet: 0, 
        openingBalance: 0, 
        isManualOpeningBalance: false, 
        manualOpeningBalanceRecord: null, 
        closingBalance: 0, 
        netCash: 0 
    });
    const [loading, setLoading] = useState(false);
    
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

    // Opening Balance Modal State
    const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(false);
    const [openingFormDate, setOpeningFormDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [openingAmount, setOpeningAmount] = useState('');
    const [openingNote, setOpeningNote] = useState('');
    const [openingLoading, setOpeningLoading] = useState(false);

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
    const [autoPrintDirect, setAutoPrintDirect] = useState(false);

    // A4 Daily Cash Flow Printable Sheet Modal
    const [isPrintSheetOpen, setIsPrintSheetOpen] = useState(false);
    
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
        description: '',
        date: format(new Date(), 'yyyy-MM-dd')
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
            setSummary(data.summary || { 
                totalIncome: 0, 
                totalExpense: 0, 
                dayNet: 0, 
                openingBalance: 0, 
                isManualOpeningBalance: false, 
                manualOpeningBalanceRecord: null, 
                closingBalance: 0, 
                netCash: 0 
            });
        } catch (err) {
            toast.error('Failed to load cash flow data');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenOpeningModal = () => {
        setOpeningFormDate(selectedDate);
        if (summary.isManualOpeningBalance && summary.manualOpeningBalanceRecord) {
            setOpeningAmount(summary.manualOpeningBalanceRecord.amount.toString());
            setOpeningNote(summary.manualOpeningBalanceRecord.note || '');
        } else {
            setOpeningAmount(summary.openingBalance !== undefined ? summary.openingBalance.toString() : '');
            setOpeningNote('');
        }
        setIsOpeningModalOpen(true);
    };

    const handleSaveOpeningBalance = async (e) => {
        e.preventDefault();
        if (openingAmount === '' || isNaN(parseFloat(openingAmount))) {
            toast.error('Please enter a valid amount');
            return;
        }
        setOpeningLoading(true);
        try {
            let cashier = 'Staff / Cashier';
            try {
                const u = JSON.parse(localStorage.getItem('user') || '{}');
                cashier = u.name || u.fullName || u.username || 'Staff';
            } catch(e) {}

            await physicalFinanceService.setOpeningBalance({
                date: openingFormDate,
                amount: parseFloat(openingAmount),
                note: openingNote.trim(),
                setBy: cashier
            });
            toast.success(`Opening balance saved for ${openingFormDate}!`);
            setIsOpeningModalOpen(false);
            if (openingFormDate !== selectedDate) {
                setSelectedDate(openingFormDate);
            } else {
                fetchData();
            }
        } catch (err) {
            toast.error('Failed to save opening balance: ' + (err.response?.data?.error || err.message));
        } finally {
            setOpeningLoading(false);
        }
    };

    const handleResetOpeningBalance = async () => {
        if (!window.confirm(`Reset manual opening balance for ${openingFormDate}? It will automatically carry forward the closing balance from previous days.`)) return;
        setOpeningLoading(true);
        try {
            await physicalFinanceService.deleteOpeningBalance(openingFormDate);
            toast.success(`Reverted ${openingFormDate} to automatic carryover balance.`);
            setIsOpeningModalOpen(false);
            fetchData();
        } catch (err) {
            toast.error('Failed to reset opening balance');
        } finally {
            setOpeningLoading(false);
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

    const filteredTransactions = transactions.filter(tx => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        const studentName = (tx.student?.studentName || `${tx.student?.firstName || ''} ${tx.student?.lastName || ''}`).toLowerCase();
        const studentId = (tx.student?.studentId || '').toLowerCase();
        const description = (tx.description || '').toLowerCase();
        const category = (tx.category || '').toLowerCase();
        const type = (tx.type || '').toLowerCase();
        const amount = (tx.amount || '').toString();

        return studentName.includes(q) ||
               studentId.includes(q) ||
               description.includes(q) ||
               category.includes(q) ||
               type.includes(q) ||
               amount.includes(q);
    });

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
            const txDate = formData.date || selectedDate;
            const createdTx = await physicalFinanceService.addTransaction({
                ...formData,
                date: txDate
            });
            toast.success('Transaction added successfully!');
            setIsAddModalOpen(false);
            const savedData = {
                ...(createdTx || {}),
                type: formData.type,
                category: formData.category,
                amount: formData.amount,
                description: formData.description,
                date: txDate
            };
            const currentCat = formData.category;
            const currentType = formData.type;
            setFormData({ type: currentType, category: currentCat, amount: '', description: '', date: selectedDate });
            
            if (txDate !== selectedDate) {
                setSelectedDate(txDate);
            } else {
                fetchData();
            }

            // Automatically open receipt/voucher modal for print preview
            handlePrintReceipt(savedData);
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

    // Print Receipt / Voucher for Income or Expense Transaction
    const handlePrintReceipt = (tx, shouldAutoPrint = true) => {
        let loggedUserCashier = 'Cashier / Staff';
        try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const u = JSON.parse(userStr);
                const name = u.name || u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username;
                if (name && name.trim()) loggedUserCashier = name.trim();
            }
        } catch (e) {}

        const isExpense = tx.type === 'EXPENSE';
        const txIdStr = tx.id ? String(tx.id) : Date.now().toString().slice(-6);
        const receiptNo = isExpense ? `EXP-${txIdStr}` : `REC-${txIdStr}`;
        const descText = tx.description 
            ? `${tx.category} - ${tx.description}` 
            : `${tx.category} ${isExpense ? 'Expense' : 'Payment'}`;

        const receiptObj = {
            isExpense,
            type: tx.type || (isExpense ? 'EXPENSE' : 'INCOME'),
            receiptNo,
            date: new Date(tx.date || tx.createdAt || Date.now()),
            studentId: tx.student?.studentId || '-',
            studentName: tx.student?.studentName || `${tx.student?.firstName || ''} ${tx.student?.lastName || ''}`.trim() || (isExpense ? null : 'Student'),
            className: descText,
            month: '',
            cardType: isExpense ? 'EXPENSE' : 'FULL',
            amount: tx.amount,
            paymentMethod: 'CASH',
            cashierName: loggedUserCashier,
            items: [
                {
                    description: descText,
                    amount: tx.amount
                }
            ],
            totalAmount: tx.amount
        };

        setAutoPrintDirect(Boolean(shouldAutoPrint));
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
                        onClick={handleOpenOpeningModal}
                        className="bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 hover:text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 border border-amber-500/30 shadow-md transition-all text-xs cursor-pointer"
                        title="Set or adjust opening balance (ආරම්භක ශේෂය) for this date"
                    >
                        <Coins size={15} className="text-amber-400" />
                        <span>Opening Balance</span>
                        {summary.isManualOpeningBalance && (
                            <span className="bg-amber-400 text-black text-[9px] font-black px-1.5 py-0.2 rounded-full shadow">
                                SET
                            </span>
                        )}
                    </button>

                    <button 
                        onClick={() => setIsPrintSheetOpen(true)}
                        className="bg-emerald-600/25 hover:bg-emerald-600/40 text-emerald-300 hover:text-white px-4 py-2.5 rounded-xl font-black flex items-center gap-2 border border-emerald-500/40 shadow-lg shadow-emerald-950/40 transition-all text-xs cursor-pointer active:scale-95"
                        title="Open official A4 Daily Cash Flow sheet to print, sign, and attach to file"
                    >
                        <Printer size={15} className="text-emerald-400" />
                        <span>Print Daily Sheet (A4)</span>
                    </button>
                    
                    <button 
                        onClick={() => {
                            // Ensure default category is selected
                            const available = categories.filter(c => c.type === formData.type);
                            if (available.length > 0 && !formData.category) {
                                setFormData(prev => ({ 
                                    ...prev, 
                                    category: available[0].name,
                                    date: selectedDate 
                                }));
                            } else {
                                setFormData(prev => ({ ...prev, date: selectedDate }));
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
                {/* 1. Opening Balance Card */}
                <div className="bg-gradient-to-br from-amber-500/15 via-amber-950/20 to-black/40 border border-amber-500/30 p-5 rounded-3xl flex flex-col justify-between relative overflow-hidden shadow-[0_4px_20px_rgba(245,158,11,0.12)]">
                    <div className="absolute -right-3 -bottom-3 text-amber-500/10 pointer-events-none"><Coins size={110} /></div>
                    <div>
                        <div className="flex justify-between items-start mb-2 relative z-10">
                            <p className="text-amber-400 text-xs font-bold uppercase tracking-wider">Opening Balance</p>
                            <button 
                                onClick={handleOpenOpeningModal}
                                className="text-[10px] text-amber-300 hover:text-white bg-amber-500/20 hover:bg-amber-500/30 px-2 py-0.5 rounded-lg border border-amber-500/30 font-bold flex items-center gap-1 transition-colors"
                                title="Set / Edit Opening Balance (ආරම්භක ශේෂය)"
                            >
                                <Edit2 size={10} /> {summary.isManualOpeningBalance ? 'Edit' : 'Set'}
                            </button>
                        </div>
                        <h3 className="text-3xl font-black text-white relative z-10 drop-shadow-md">
                            Rs. {(summary.openingBalance || 0).toLocaleString()}
                        </h3>
                    </div>
                    <div className="mt-3 relative z-10 flex items-center gap-1.5 text-[10px]">
                        {summary.isManualOpeningBalance ? (
                            <span className="text-amber-300 font-bold bg-amber-500/25 px-2 py-0.5 rounded-md border border-amber-500/40">
                                ⭐ Manually Set
                            </span>
                        ) : (
                            <span className="text-blue-300 font-medium bg-blue-500/15 px-2 py-0.5 rounded-md border border-blue-500/20">
                                🔄 Carried Forward
                            </span>
                        )}
                    </div>
                </div>

                {/* 2. Total Income Card */}
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-5 rounded-3xl flex flex-col justify-between relative overflow-hidden shadow-[0_4px_20px_rgba(16,185,129,0.15)]">
                    <div className="absolute -right-3 -bottom-3 text-emerald-500/10 pointer-events-none"><TrendingUp size={110} /></div>
                    <div>
                        <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2 relative z-10">Total Income</p>
                        <h3 className="text-3xl font-black text-white relative z-10 drop-shadow-md">
                            Rs. {(summary.totalIncome || 0).toLocaleString()}
                        </h3>
                    </div>
                    <p className="text-[10px] text-emerald-300/70 font-semibold mt-3 relative z-10">
                        {transactions.filter(t => t.type === 'INCOME').length} incoming entries
                    </p>
                </div>

                {/* 3. Total Expenses Card */}
                <div className="bg-red-500/10 border border-red-500/30 p-5 rounded-3xl flex flex-col justify-between relative overflow-hidden shadow-[0_4px_20px_rgba(239,68,68,0.15)]">
                    <div className="absolute -right-3 -bottom-3 text-red-500/10 pointer-events-none"><TrendingDown size={110} /></div>
                    <div>
                        <p className="text-red-400 text-xs font-bold uppercase tracking-wider mb-2 relative z-10">Total Expenses</p>
                        <h3 className="text-3xl font-black text-white relative z-10 drop-shadow-md">
                            Rs. {(summary.totalExpense || 0).toLocaleString()}
                        </h3>
                    </div>
                    <p className="text-[10px] text-red-300/70 font-semibold mt-3 relative z-10">
                        {transactions.filter(t => t.type === 'EXPENSE').length} outgoing entries
                    </p>
                </div>

                {/* 4. Day's Closing Balance / Cash in Hand */}
                <div className={`p-5 rounded-3xl flex flex-col justify-between relative overflow-hidden shadow-[0_8px_30px_rgba(59,130,246,0.35)] border ${
                    (summary.closingBalance !== undefined ? summary.closingBalance : summary.netCash || 0) >= 0 
                        ? 'bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 border-blue-400/50' 
                        : 'bg-gradient-to-tr from-rose-700 to-rose-500 border-rose-400/50'
                }`}>
                    <div className="absolute -right-3 -bottom-3 text-white/10 pointer-events-none"><Wallet size={110} /></div>
                    <div>
                        <p className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-2 relative z-10">
                            Day's Closing Balance
                        </p>
                        <h3 className="text-3xl font-black text-white relative z-10 drop-shadow-lg">
                            Rs. {(summary.closingBalance !== undefined ? summary.closingBalance : summary.netCash || 0).toLocaleString()}
                        </h3>
                    </div>
                    <p className="text-[10px] text-blue-100/80 font-bold mt-3 relative z-10 flex items-center gap-1">
                        ↳ Carries forward to next day
                    </p>
                </div>
            </div>

            {/* Transaction List */}
            <div className="bg-black/40 backdrop-blur-xl border border-white/20 rounded-[2rem] shadow-lg flex-1 overflow-hidden flex flex-col min-h-[400px]">
                <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold">Transaction History</h3>
                        <span className="text-xs text-white/50 bg-white/5 px-3 py-1 rounded-full border border-white/10 font-bold">
                            {filteredTransactions.length} of {transactions.length} entries on {selectedDate}
                        </span>
                    </div>
                    
                    {/* Search Bar */}
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" size={16} />
                        <input 
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search student, class, category..."
                            className="w-full bg-black/40 border border-white/15 rounded-xl pl-10 pr-8 py-2 text-xs text-white placeholder-white/40 outline-none focus:border-blue-500/60 focus:bg-black/60 transition-all font-medium shadow-inner"
                        />
                        {searchQuery && (
                            <button 
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white bg-white/10 hover:bg-white/20 p-1 rounded-md transition-colors"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
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
                    ) : filteredTransactions.length === 0 ? (
                        <div className="text-center py-16 text-white/40 font-semibold flex flex-col items-center gap-2">
                            <Search size={40} className="opacity-30 mb-2" />
                            <span>No transactions match "{searchQuery}".</span>
                            <button onClick={() => setSearchQuery('')} className="text-xs text-blue-400 hover:underline mt-1 font-bold">Clear Search Filter</button>
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
                                {filteredTransactions.map((t) => (
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
                                                <button 
                                                    onClick={() => handlePrintReceipt(t)} 
                                                    className={`${t.type === 'EXPENSE' ? 'text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20' : 'text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20'} p-2 rounded-lg transition-all`}
                                                    title={t.type === 'EXPENSE' ? 'Print 80mm Expense Voucher (Xprinter)' : 'Print 80mm Thermal Receipt (Xprinter)'}
                                                >
                                                    <Printer size={15} />
                                                </button>
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

                {/* Daily Settlement Summary Footer Banner */}
                <div className="p-4 bg-gradient-to-r from-blue-950/60 via-slate-900/80 to-purple-950/60 border-t border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                            <Coins size={20} />
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-white flex items-center gap-2">
                                <span>Day Balance Settlement ({selectedDate})</span>
                                {summary.isManualOpeningBalance && (
                                    <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                                        Manual Opening
                                    </span>
                                )}
                            </h4>
                            <p className="text-[11px] text-white/50">
                                Opening balance settles with today's collections & expenses to yield the closing balance.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                        <div className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm">
                            <span className="text-white/50 font-normal">Opening:</span>
                            <span className="text-amber-300 font-extrabold">Rs. {(summary.openingBalance || 0).toLocaleString()}</span>
                        </div>
                        <span className="text-white/30">+</span>
                        <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm">
                            <span className="text-emerald-400/70 font-normal">Income:</span>
                            <span className="text-emerald-400 font-extrabold">Rs. {(summary.totalIncome || 0).toLocaleString()}</span>
                        </div>
                        <span className="text-white/30">-</span>
                        <div className="bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm">
                            <span className="text-red-400/70 font-normal">Expense:</span>
                            <span className="text-red-400 font-extrabold">Rs. {(summary.totalExpense || 0).toLocaleString()}</span>
                        </div>
                        <span className="text-white/30">=</span>
                        <div className="bg-blue-600/30 border border-blue-400/40 px-3.5 py-1.5 rounded-xl flex items-center gap-2 text-blue-200 shadow-lg shadow-blue-500/10">
                            <span className="text-white/70 font-normal">Closing Balance:</span>
                            <span className="text-white font-black text-sm">Rs. {(summary.closingBalance !== undefined ? summary.closingBalance : summary.netCash || 0).toLocaleString()}</span>
                        </div>
                    </div>
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
                            {/* Date Field with Calendar Picker */}
                            <div>
                                <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1">Date *</label>
                                <div className="relative">
                                    <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" />
                                    <input 
                                        type="date" 
                                        required
                                        value={formData.date || selectedDate}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 font-bold text-sm shadow-inner"
                                    />
                                </div>
                            </div>

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

            {/* SET OPENING BALANCE MODAL */}
            {isOpeningModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex justify-center items-center p-4">
                    <div className="bg-[#151522] border border-amber-500/30 p-6 rounded-3xl w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in duration-200 text-white">
                        <button 
                            onClick={() => setIsOpeningModalOpen(false)} 
                            className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors bg-white/5 p-2 rounded-xl"
                        >
                            <X size={18} />
                        </button>

                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                                <Coins size={22} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">Set Opening Balance</h3>
                                <p className="text-xs text-white/50">ආරම්භක ශේෂය ඇතුළත් කිරීම</p>
                            </div>
                        </div>

                        <form onSubmit={handleSaveOpeningBalance} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1">
                                    Effective Date (අදාළ දිනය) *
                                </label>
                                <div className="relative">
                                    <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-400 pointer-events-none" />
                                    <input 
                                        type="date"
                                        required
                                        value={openingFormDate}
                                        onChange={(e) => setOpeningFormDate(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 font-bold text-sm shadow-inner"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1">
                                    Opening Balance Amount (රුපියල්) *
                                </label>
                                <input 
                                    type="number"
                                    step="any"
                                    required
                                    value={openingAmount}
                                    onChange={(e) => setOpeningAmount(e.target.value)}
                                    placeholder="e.g. 50000"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-xl font-black shadow-inner"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1">
                                    Note / Description (විස්තරය)
                                </label>
                                <input 
                                    type="text"
                                    value={openingNote}
                                    onChange={(e) => setOpeningNote(e.target.value)}
                                    placeholder="e.g. 08/31 ඉතිරි ශේෂය (Carried over from August 31)"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-sm shadow-inner"
                                />
                            </div>

                            {/* Helpful Sinhala explainer banner */}
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3.5 text-xs text-amber-200/90 leading-relaxed">
                                💡 <span className="font-bold">ක්‍රියාකාරීත්වය:</span> මෙහි ඇතුළත් කරන ආරම්භක ශේෂය එදින ආදායම් සහ වියදම් සමඟ ගලපා එදින අවසාන ශේෂය ගණනය වේ. එම අවසාන ශේෂය ස්වයංක්‍රීයව පසුදින ආරම්භක ශේෂය බවට පත්වේ.
                            </div>

                            <div className="flex gap-2 pt-2">
                                {summary.isManualOpeningBalance && openingFormDate === selectedDate && (
                                    <button
                                        type="button"
                                        onClick={handleResetOpeningBalance}
                                        disabled={openingLoading}
                                        className="w-1/3 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-xl font-bold border border-red-500/30 text-xs transition-colors"
                                    >
                                        Reset Auto
                                    </button>
                                )}
                                <button 
                                    type="submit" 
                                    disabled={openingLoading}
                                    className="flex-1 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black rounded-xl shadow-lg shadow-amber-500/20 transition-all text-sm cursor-pointer"
                                >
                                    {openingLoading ? 'Saving...' : 'Save Opening Balance'}
                                </button>
                            </div>
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
                autoPrint={autoPrintDirect}
            />

            {/* A4 Daily Cash Flow Printable Sheet Modal */}
            <DailyCashFlowPrintModal
                isOpen={isPrintSheetOpen}
                onClose={() => setIsPrintSheetOpen(false)}
                selectedDate={selectedDate}
                transactions={transactions}
                summary={summary}
                onDateChange={(d) => setSelectedDate(d)}
            />

        </div>
    );
}
