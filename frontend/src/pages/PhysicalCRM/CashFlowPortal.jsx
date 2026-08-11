import React, { useState, useEffect } from 'react';
import { physicalFinanceService } from '../../api/physicalFinance';
import { Wallet, TrendingUp, TrendingDown, Plus, Trash2, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function CashFlowPortal() {
    const [transactions, setTransactions] = useState([]);
    const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0, netCash: 0 });
    const [loading, setLoading] = useState(false);
    
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    
    const [formData, setFormData] = useState({
        type: 'INCOME',
        category: 'OTHER',
        amount: '',
        description: ''
    });

    useEffect(() => {
        fetchData();
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

    const handleAddTransaction = async (e) => {
        e.preventDefault();
        try {
            await physicalFinanceService.addTransaction(formData);
            toast.success('Transaction added successfully!');
            setIsAddModalOpen(false);
            setFormData({ type: 'INCOME', category: 'OTHER', amount: '', description: '' });
            fetchData();
        } catch (err) {
            toast.error('Failed to add transaction');
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

    return (
        <div className="p-4 md:p-6 h-full flex flex-col gap-6 animate-fade-in text-white relative">
            
            {/* Header & Date Picker */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-black/40 backdrop-blur-xl border border-white/20 p-6 rounded-[2rem] shadow-lg">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2 drop-shadow-md">
                        <Wallet className="text-emerald-400" /> Cash Flow Dashboard
                    </h2>
                    <p className="text-white/60 text-sm mt-1">Manage daily physical campus income and expenses</p>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
                        <Calendar size={18} className="text-blue-400" />
                        <input 
                            type="date" 
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-transparent outline-none text-white font-bold"
                        />
                    </div>
                    
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5"
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

                <div className="bg-gradient-to-tr from-blue-600 to-blue-400 p-6 rounded-3xl flex flex-col justify-center relative overflow-hidden shadow-[0_8px_30px_rgba(59,130,246,0.4)] border border-blue-400/50">
                    <div className="absolute -right-4 -bottom-4 text-white/10"><Wallet size={120} /></div>
                    <p className="text-blue-100 text-sm font-bold uppercase tracking-wider mb-2 relative z-10">Cash In Hand (Net)</p>
                    <h3 className="text-5xl font-black text-white relative z-10 drop-shadow-lg">Rs. {summary.netCash.toLocaleString()}</h3>
                </div>
            </div>

            {/* Transaction List */}
            <div className="bg-black/40 backdrop-blur-xl border border-white/20 rounded-[2rem] shadow-lg flex-1 overflow-hidden flex flex-col min-h-[400px]">
                <div className="p-6 border-b border-white/10">
                    <h3 className="text-xl font-bold">Transaction History</h3>
                </div>
                
                <div className="p-6 overflow-auto flex-1">
                    {loading ? (
                        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div></div>
                    ) : transactions.length === 0 ? (
                        <div className="text-center py-12 text-white/40 font-semibold">No transactions found for this date.</div>
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
                                                <span className="text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded text-xs font-bold border border-emerald-500/20">INCOME</span>
                                            ) : (
                                                <span className="text-red-400 bg-red-500/10 px-2 py-1 rounded text-xs font-bold border border-red-500/20">EXPENSE</span>
                                            )}
                                        </td>
                                        <td className="py-4 font-semibold text-white/80">{t.category}</td>
                                        <td className="py-4">
                                            <div>{t.description || '-'}</div>
                                            {t.student && <div className="text-xs text-blue-400 mt-0.5">{t.student.firstName} {t.student.lastName} ({t.student.studentId})</div>}
                                        </td>
                                        <td className={`py-4 text-right font-bold ${t.type === 'INCOME' ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {t.type === 'INCOME' ? '+' : '-'}{t.amount.toLocaleString()}
                                        </td>
                                        <td className="py-4 text-center">
                                            <button onClick={() => handleDelete(t.id)} className="text-white/30 hover:text-red-400 transition-colors p-2 bg-white/5 rounded-lg hover:bg-white/10">
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
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
                    <div className="bg-[#1a1a2e] border border-white/20 p-6 rounded-3xl w-full max-w-md shadow-2xl relative animate-scale-in">
                        <button onClick={() => setIsAddModalOpen(false)} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors bg-white/5 p-2 rounded-xl">
                            <Plus size={20} className="rotate-45" />
                        </button>
                        
                        <h2 className="text-2xl font-bold text-white mb-6">Add Transaction</h2>
                        
                        <form onSubmit={handleAddTransaction} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1">Type</label>
                                    <select 
                                        value={formData.type}
                                        onChange={(e) => setFormData({...formData, type: e.target.value})}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 appearance-none font-bold"
                                    >
                                        <option value="INCOME" className="text-black">INCOME</option>
                                        <option value="EXPENSE" className="text-black">EXPENSE</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1">Category</label>
                                    <select 
                                        value={formData.category}
                                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 appearance-none font-bold"
                                    >
                                        {formData.type === 'INCOME' ? (
                                            <>
                                                <option value="REGISTRATION" className="text-black">Registration</option>
                                                <option value="CLASS_FEE" className="text-black">Class Fee</option>
                                                <option value="OTHER" className="text-black">Other Income</option>
                                            </>
                                        ) : (
                                            <>
                                                <option value="UTILITY" className="text-black">Utility</option>
                                                <option value="SUPPLIES" className="text-black">Supplies</option>
                                                <option value="REFUND" className="text-black">Refund</option>
                                                <option value="OTHER" className="text-black">Other Expense</option>
                                            </>
                                        )}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1">Amount (Rs) *</label>
                                <input 
                                    type="number" 
                                    required 
                                    value={formData.amount}
                                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500 text-lg font-bold"
                                    placeholder="0.00"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1">Description</label>
                                <textarea 
                                    value={formData.description}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500 min-h-[80px]"
                                    placeholder="Optional details..."
                                ></textarea>
                            </div>

                            <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-all mt-4">
                                Save Entry
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
