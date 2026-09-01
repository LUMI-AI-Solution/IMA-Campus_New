import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';
import { 
    Printer, Download, RefreshCw, CheckSquare, Square, 
    Calendar, DollarSign, PhoneCall, Building2, Sparkles, 
    FileText, CheckCircle2, ShieldCheck, CreditCard, ChevronRight,
    Edit3, Info, Copy, Share2
} from 'lucide-react';

export default function LumiInvoiceGenerator() {
    // Current month defaults
    const getInitialMonth = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    };

    const [selectedMonth, setSelectedMonth] = useState(getInitialMonth);
    const [invoiceNo, setInvoiceNo] = useState(`INV-LUMI-${getInitialMonth().replace('-', '')}-001`);
    const [invoiceDate, setInvoiceDate] = useState(() => {
        const now = new Date();
        return now.toISOString().split('T')[0];
    });
    const [dueDate, setDueDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        return d.toISOString().split('T')[0];
    });

    const [loading, setLoading] = useState(true);
    const [rateConfig, setRateConfig] = useState({
        fixedRentalPerNumber: 2500,
        costPerMinute: 5.0
    });
    const [bankDetails, setBankDetails] = useState({
        accountNumber: "115452324957",
        bankName: "Sampath Bank",
        branch: "Aralaganwila Branch",
        accountName: "Chamindu Dilshan"
    });

    // Business selection & items state
    // Array of { id, name, logo, selected, freeSeminar: { selected, callCount, minutes, fixedFee, ratePerMin }, afterSeminar: { selected, callCount, minutes, fixedFee, ratePerMin } }
    const [businessItems, setBusinessItems] = useState([]);
    const [isEditingRates, setIsEditingRates] = useState(false);
    const invoiceRef = useRef(null);

    useEffect(() => {
        fetchInvoiceData();
    }, [selectedMonth]);

    const fetchInvoiceData = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/admin/staff/lumi-invoice-data?month=${selectedMonth}`);
            if (res.data && res.data.businesses) {
                if (res.data.rateConfig) setRateConfig(res.data.rateConfig);
                if (res.data.bankDetails) setBankDetails(res.data.bankDetails);

                const items = res.data.businesses.map(b => ({
                    id: b.id,
                    name: b.name,
                    logo: b.logo,
                    selected: true,
                    freeSeminar: {
                        selected: true,
                        callCount: b.freeSeminar?.callCount || 0,
                        minutes: b.freeSeminar?.durationMinutes || 0,
                        fixedFee: b.freeSeminar?.fixedRental || 2500,
                        ratePerMin: b.freeSeminar?.ratePerMinute || 5.0
                    },
                    afterSeminar: {
                        selected: true,
                        callCount: b.afterSeminar?.callCount || 0,
                        minutes: b.afterSeminar?.durationMinutes || 0,
                        fixedFee: b.afterSeminar?.fixedRental || 2500,
                        ratePerMin: b.afterSeminar?.ratePerMinute || 5.0
                    }
                }));

                setBusinessItems(items);

                // Auto update invoice number based on month
                const monthClean = selectedMonth.replace('-', '');
                setInvoiceNo(`INV-LUMI-${monthClean}-001`);
            }
        } catch (error) {
            console.error("Failed to load Lumi invoice data:", error);
            toast.error("Failed to fetch monthly calling data");
        }
        setLoading(false);
    };

    // Toggle entire business
    const toggleBusiness = (id) => {
        setBusinessItems(prev => prev.map(b => {
            if (b.id === id) {
                const nextSelected = !b.selected;
                return {
                    ...b,
                    selected: nextSelected,
                    freeSeminar: { ...b.freeSeminar, selected: nextSelected },
                    afterSeminar: { ...b.afterSeminar, selected: nextSelected }
                };
            }
            return b;
        }));
    };

    // Toggle specific campaign for a business
    const toggleCampaign = (bizId, campaignType) => {
        setBusinessItems(prev => prev.map(b => {
            if (b.id === bizId) {
                const updatedCampaign = {
                    ...b[campaignType],
                    selected: !b[campaignType].selected
                };
                const anySelected = campaignType === 'freeSeminar' 
                    ? (updatedCampaign.selected || b.afterSeminar.selected)
                    : (b.freeSeminar.selected || updatedCampaign.selected);

                return {
                    ...b,
                    [campaignType]: updatedCampaign,
                    selected: anySelected
                };
            }
            return b;
        }));
    };

    // Update minutes override
    const handleMinutesChange = (bizId, campaignType, value) => {
        const num = Math.max(0, parseInt(value) || 0);
        setBusinessItems(prev => prev.map(b => {
            if (b.id === bizId) {
                return {
                    ...b,
                    [campaignType]: {
                        ...b[campaignType],
                        minutes: num
                    }
                };
            }
            return b;
        }));
    };

    // Select / Deselect All
    const handleSelectAll = (selectStatus) => {
        setBusinessItems(prev => prev.map(b => ({
            ...b,
            selected: selectStatus,
            freeSeminar: { ...b.freeSeminar, selected: selectStatus },
            afterSeminar: { ...b.afterSeminar, selected: selectStatus }
        })));
    };

    // Calculate invoice totals
    const calculations = useMemo(() => {
        let totalActiveNumbers = 0;
        let totalFixedRental = 0;
        let totalMinutes = 0;
        let totalUsageAmount = 0;
        let lineItems = [];

        businessItems.forEach((b, idx) => {
            if (!b.selected) return;

            // Free Seminar Line
            if (b.freeSeminar.selected) {
                totalActiveNumbers += 1;
                const fixed = b.freeSeminar.fixedFee || rateConfig.fixedRentalPerNumber;
                const mins = b.freeSeminar.minutes || 0;
                const rate = b.freeSeminar.ratePerMin || rateConfig.costPerMinute;
                const usage = mins * rate;
                const lineTotal = fixed + usage;

                totalFixedRental += fixed;
                totalMinutes += mins;
                totalUsageAmount += usage;

                lineItems.push({
                    bizId: b.id,
                    bizName: b.name,
                    bizLogo: b.logo,
                    campaignType: 'FREE_SEMINAR',
                    campaignLabel: 'Free Seminar Dedicated Hotline',
                    fixedFee: fixed,
                    calls: b.freeSeminar.callCount,
                    minutes: mins,
                    ratePerMin: rate,
                    usageAmount: usage,
                    total: lineTotal
                });
            }

            // After Seminar Line
            if (b.afterSeminar.selected) {
                totalActiveNumbers += 1;
                const fixed = b.afterSeminar.fixedFee || rateConfig.fixedRentalPerNumber;
                const mins = b.afterSeminar.minutes || 0;
                const rate = b.afterSeminar.ratePerMin || rateConfig.costPerMinute;
                const usage = mins * rate;
                const lineTotal = fixed + usage;

                totalFixedRental += fixed;
                totalMinutes += mins;
                totalUsageAmount += usage;

                lineItems.push({
                    bizId: b.id,
                    bizName: b.name,
                    bizLogo: b.logo,
                    campaignType: 'AFTER_SEMINAR',
                    campaignLabel: 'After Seminar Dedicated Hotline',
                    fixedFee: fixed,
                    calls: b.afterSeminar.callCount,
                    minutes: mins,
                    ratePerMin: rate,
                    usageAmount: usage,
                    total: lineTotal
                });
            }
        });

        const grandTotal = totalFixedRental + totalUsageAmount;

        return {
            totalActiveNumbers,
            totalFixedRental,
            totalMinutes,
            totalUsageAmount,
            grandTotal,
            lineItems
        };
    }, [businessItems, rateConfig]);

    // Print Invoice
    const handlePrint = () => {
        window.print();
    };

    // Copy Summary Text
    const handleCopySummary = () => {
        const monthText = new Date(selectedMonth + "-01").toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const summaryText = `*🧾 LUMI WHATSAPP CALLER SERVICE INVOICE*\n` +
            `*Invoice No:* ${invoiceNo}\n` +
            `*Period:* ${monthText}\n` +
            `*Billed To:* IMA Campus (Pvt) Ltd\n` +
            `------------------------------------\n` +
            `*📞 Active Number Rentals:* ${calculations.totalActiveNumbers} Numbers @ LKR 2,500/- = LKR ${calculations.totalFixedRental.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n` +
            `*⏱️ Total Outbound Minutes:* ${calculations.totalMinutes} Mins @ LKR 5.00/min = LKR ${calculations.totalUsageAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n` +
            `------------------------------------\n` +
            `*💰 GRAND TOTAL AMOUNT:* LKR ${calculations.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n\n` +
            `*🏦 Bank Details for Payment:*\n` +
            `Bank: ${bankDetails.bankName}\n` +
            `Branch: ${bankDetails.branch}\n` +
            `Account No: ${bankDetails.accountNumber}\n` +
            `Account Name: ${bankDetails.accountName}\n\n` +
            `_Auto generated by LUMI AI Solutions System_`;

        navigator.clipboard.writeText(summaryText);
        toast.success("Invoice summary copied to clipboard!");
    };

    const formatLKR = (amount) => {
        return Number(amount || 0).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const monthFormatted = useMemo(() => {
        try {
            return new Date(selectedMonth + "-01").toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        } catch (e) {
            return selectedMonth;
        }
    }, [selectedMonth]);

    return (
        <div className="space-y-6 font-sans text-slate-200">
            
            {/* Top Interactive Configuration Deck (Hidden during Print) */}
            <div className="print:hidden bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-md space-y-6">
                
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-6 border-b border-slate-800">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
                            <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                                <FileText className="text-indigo-400" size={24} />
                            </div>
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white tracking-wide flex items-center gap-2">
                                Lumi WhatsApp Caller Invoice Generator
                                <span className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                                    Live Billing Engine
                                </span>
                            </h2>
                            <p className="text-xs text-slate-400">Generate, customize and print single monthly billing statement for IMA Campus</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        <button 
                            onClick={fetchInvoiceData} 
                            disabled={loading}
                            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-700 transition-all shadow-sm"
                        >
                            <RefreshCw size={14} className={loading ? "animate-spin text-indigo-400" : "text-indigo-400"} />
                            Refresh Live Data
                        </button>
                        
                        <button 
                            onClick={handleCopySummary}
                            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-700 transition-all shadow-sm"
                        >
                            <Copy size={14} className="text-emerald-400" />
                            Copy Summary
                        </button>

                        <button 
                            onClick={handlePrint}
                            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-black px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all hover:scale-105"
                        >
                            <Printer size={15} />
                            Print / Save PDF
                        </button>
                    </div>
                </div>

                {/* Configuration Controls Bar */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    
                    {/* Month Picker */}
                    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-3.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5 flex items-center gap-1.5">
                            <Calendar size={12} className="text-indigo-400" /> Billing Month
                        </label>
                        <input 
                            type="month" 
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-white outline-none focus:border-indigo-500 transition-colors"
                        />
                    </div>

                    {/* Invoice Number */}
                    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-3.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5 flex items-center gap-1.5">
                            <FileText size={12} className="text-purple-400" /> Invoice Number
                        </label>
                        <input 
                            type="text" 
                            value={invoiceNo}
                            onChange={(e) => setInvoiceNo(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-white outline-none focus:border-indigo-500 transition-colors"
                        />
                    </div>

                    {/* Invoice Date */}
                    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-3.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5 flex items-center gap-1.5">
                            <Calendar size={12} className="text-emerald-400" /> Invoice Date
                        </label>
                        <input 
                            type="date" 
                            value={invoiceDate}
                            onChange={(e) => setInvoiceDate(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-white outline-none focus:border-indigo-500 transition-colors"
                        />
                    </div>

                    {/* Due Date */}
                    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-3.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5 flex items-center gap-1.5">
                            <Calendar size={12} className="text-rose-400" /> Payment Due Date
                        </label>
                        <input 
                            type="date" 
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-white outline-none focus:border-indigo-500 transition-colors"
                        />
                    </div>
                </div>

                {/* Business Selection & Campaign Configuration Matrix */}
                <div className="space-y-3 pt-2">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                            <Building2 size={16} className="text-indigo-400" /> 
                            CRM Businesses & Active WhatsApp Hotlines
                        </h3>
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => handleSelectAll(true)}
                                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
                            >
                                <CheckSquare size={13} /> Select All
                            </button>
                            <span className="text-slate-600">•</span>
                            <button 
                                onClick={() => handleSelectAll(false)}
                                className="text-xs font-bold text-slate-400 hover:text-slate-300 transition-colors flex items-center gap-1"
                            >
                                <Square size={13} /> Deselect All
                            </button>
                        </div>
                    </div>

                    {/* Business Grid with live toggles & minute editing */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {businessItems.map((biz) => {
                            const isBizActive = biz.selected;
                            return (
                                <div 
                                    key={biz.id}
                                    className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between gap-3 ${isBizActive ? 'bg-slate-800/90 border-slate-700 shadow-md' : 'bg-slate-900/40 border-slate-800/80 opacity-60'}`}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <button 
                                                onClick={() => toggleBusiness(biz.id)}
                                                className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${isBizActive ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}
                                            >
                                                {isBizActive ? <CheckSquare size={14} /> : <Square size={14} />}
                                            </button>

                                            <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                                                {biz.logo ? (
                                                    <img src={`/storage/businesses/${biz.logo}`} alt={biz.name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                                                ) : (
                                                    <Building2 size={16} className="text-slate-500" />
                                                )}
                                            </div>

                                            <h4 className="text-xs font-bold text-slate-100 truncate max-w-[160px]">
                                                {biz.name}
                                            </h4>
                                        </div>

                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                                            ID #{biz.id}
                                        </span>
                                    </div>

                                    {/* Campaign lines for this business */}
                                    <div className="space-y-2 pt-2 border-t border-slate-700/60 text-xs">
                                        
                                        {/* Free Seminar Line */}
                                        <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                                <input 
                                                    type="checkbox"
                                                    checked={biz.freeSeminar.selected}
                                                    onChange={() => toggleCampaign(biz.id, 'freeSeminar')}
                                                    className="rounded border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
                                                />
                                                <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                                                    🟢 Free Seminar
                                                </span>
                                            </label>

                                            <div className="flex items-center gap-1.5">
                                                <input 
                                                    type="number"
                                                    value={biz.freeSeminar.minutes}
                                                    onChange={(e) => handleMinutesChange(biz.id, 'freeSeminar', e.target.value)}
                                                    className="w-16 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-right text-xs font-mono font-bold text-emerald-400 outline-none focus:border-indigo-500"
                                                    title="Billable Outbound Minutes"
                                                />
                                                <span className="text-[10px] font-bold text-slate-400">mins</span>
                                            </div>
                                        </div>

                                        {/* After Seminar Line */}
                                        <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                                <input 
                                                    type="checkbox"
                                                    checked={biz.afterSeminar.selected}
                                                    onChange={() => toggleCampaign(biz.id, 'afterSeminar')}
                                                    className="rounded border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
                                                />
                                                <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                                                    🟣 After Seminar
                                                </span>
                                            </label>

                                            <div className="flex items-center gap-1.5">
                                                <input 
                                                    type="number"
                                                    value={biz.afterSeminar.minutes}
                                                    onChange={(e) => handleMinutesChange(biz.id, 'afterSeminar', e.target.value)}
                                                    className="w-16 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-right text-xs font-mono font-bold text-purple-400 outline-none focus:border-indigo-500"
                                                    title="Billable Outbound Minutes"
                                                />
                                                <span className="text-[10px] font-bold text-slate-400">mins</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* 🧾 ACTUAL INVOICE DOCUMENT (PRINT-READY SHEET) */}
            <div 
                ref={invoiceRef}
                className="bg-white text-slate-900 p-8 sm:p-12 rounded-3xl shadow-2xl border border-slate-200 max-w-5xl mx-auto print:max-w-none print:m-0 print:p-8 print:shadow-none print:border-none print:rounded-none"
            >
                {/* Invoice Top Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-8 border-b-2 border-slate-100">
                    
                    {/* Left: LUMI Logo & Branding */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                            <img 
                                src="/lumi_logo.png" 
                                alt="LUMI AI Solutions" 
                                className="h-16 w-auto object-contain"
                            />
                        </div>
                        <div className="text-xs text-slate-500 space-y-0.5">
                            <p className="font-bold text-slate-800">LUMI AI SOLUTIONS (PVT) LTD</p>
                            <p>Automate | Innovate | Elevate</p>
                            <p>Enterprise AI & Voice Communication Services</p>
                            <p>Web: www.lumi.ai • Email: billing@lumi.ai</p>
                        </div>
                    </div>

                    {/* Right: IMA Campus Logo & Invoice Title */}
                    <div className="flex flex-col items-start sm:items-end gap-2">
                        <div className="flex items-center gap-3">
                            <img 
                                src="/logo.png" 
                                alt="IMA Campus" 
                                className="h-12 w-auto object-contain"
                            />
                            <div className="text-right">
                                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">
                                    INVOICE
                                </h1>
                                <span className="inline-block bg-indigo-50 text-indigo-700 text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full border border-indigo-200">
                                    LUMI WHATSAPP CALLER
                                </span>
                            </div>
                        </div>

                        <div className="mt-2 text-xs text-slate-600 sm:text-right space-y-1">
                            <p><span className="font-bold text-slate-800">Invoice No:</span> <span className="font-mono font-bold text-indigo-900">{invoiceNo}</span></p>
                            <p><span className="font-bold text-slate-800">Billing Period:</span> <span className="font-bold">{monthFormatted}</span></p>
                            <p><span className="font-bold text-slate-800">Invoice Date:</span> {invoiceDate}</p>
                            <p><span className="font-bold text-slate-800">Due Date:</span> <span className="font-bold text-rose-700">{dueDate}</span></p>
                        </div>
                    </div>
                </div>

                {/* Billed From / Billed To Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-slate-100">
                    <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/80">
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-2">
                            BILLED FROM (SERVICE PROVIDER)
                        </p>
                        <h3 className="font-black text-sm text-slate-900">LUMI AI Solutions</h3>
                        <p className="text-xs text-slate-600 mt-1">Specialized AI WhatsApp Calling & Voice Cloud</p>
                        <p className="text-xs text-slate-600">Colombo, Sri Lanka</p>
                    </div>

                    <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/80">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                            BILLED TO (CLIENT)
                        </p>
                        <h3 className="font-black text-sm text-slate-900">IMA CAMPUS (PVT) LTD</h3>
                        <p className="text-xs text-slate-600 mt-1">Higher Education & Student Academic Operations</p>
                        <p className="text-xs text-slate-600">Sri Lanka</p>
                    </div>
                </div>

                {/* Itemized Service Table */}
                <div className="py-6 space-y-4">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b-2 border-slate-800 text-slate-800 font-black text-[11px] uppercase tracking-wider bg-slate-100/80">
                                    <th className="py-3 px-3">#</th>
                                    <th className="py-3 px-3">Business Department</th>
                                    <th className="py-3 px-3">Campaign Channel</th>
                                    <th className="py-3 px-3 text-right">Fixed Rental (LKR)</th>
                                    <th className="py-3 px-3 text-right">Calls</th>
                                    <th className="py-3 px-3 text-right">Outbound Mins</th>
                                    <th className="py-3 px-3 text-right">Rate / Min</th>
                                    <th className="py-3 px-3 text-right">Usage Cost (LKR)</th>
                                    <th className="py-3 px-3 text-right">Subtotal (LKR)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                {calculations.lineItems.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" className="py-8 text-center text-slate-400 font-medium">
                                            No businesses or hotlines selected for this invoice.
                                        </td>
                                    </tr>
                                ) : (
                                    calculations.lineItems.map((item, index) => (
                                        <tr key={`${item.bizId}_${item.campaignType}`} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-3 px-3 font-bold text-slate-400">{index + 1}</td>
                                            <td className="py-3 px-3 font-bold text-slate-900 flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-md bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                                                    {item.bizLogo ? (
                                                        <img src={`/storage/businesses/${item.bizLogo}`} alt={item.bizName} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                                                    ) : (
                                                        <Building2 size={12} className="text-slate-400" />
                                                    )}
                                                </div>
                                                <span>{item.bizName}</span>
                                            </td>
                                            <td className="py-3 px-3">
                                                <span className={`inline-flex items-center gap-1 font-semibold text-[11px] px-2 py-0.5 rounded-full border ${item.campaignType === 'FREE_SEMINAR' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-purple-50 text-purple-800 border-purple-200'}`}>
                                                    {item.campaignLabel}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3 text-right font-mono text-slate-800">
                                                {formatLKR(item.fixedFee)}
                                            </td>
                                            <td className="py-3 px-3 text-right font-mono text-slate-600">
                                                {item.calls}
                                            </td>
                                            <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                                                {item.minutes}
                                            </td>
                                            <td className="py-3 px-3 text-right font-mono text-slate-500">
                                                {formatLKR(item.ratePerMin)}
                                            </td>
                                            <td className="py-3 px-3 text-right font-mono text-slate-800">
                                                {formatLKR(item.usageAmount)}
                                            </td>
                                            <td className="py-3 px-3 text-right font-mono font-bold text-slate-950">
                                                {formatLKR(item.total)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Totals & Summary Calculation Deck */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 pb-8 border-t-2 border-slate-100">
                    
                    {/* Left: Summary Formula Breakdown */}
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                            <Info size={14} className="text-indigo-600" />
                            Cost Breakdown Formula
                        </h4>
                        
                        <div className="text-xs space-y-2 text-slate-600">
                            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                                <span className="font-medium">1. Fixed Dedicated Number Rentals</span>
                                <span className="font-bold text-slate-900">{calculations.totalActiveNumbers} Numbers × LKR 2,500.00</span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                                <span className="font-medium">2. Outbound WhatsApp Call Minutes</span>
                                <span className="font-bold text-slate-900">{calculations.totalMinutes} Mins × LKR 5.00</span>
                            </div>
                            <div className="flex justify-between items-center py-1 text-slate-800">
                                <span className="font-bold">Total Service Lines Configured</span>
                                <span className="font-bold">{calculations.totalActiveNumbers} Hotlines</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Grand Total Box */}
                    <div className="flex flex-col justify-between gap-3 bg-slate-900 text-white p-6 rounded-2xl shadow-xl">
                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between items-center text-slate-300">
                                <span>Total Fixed Number Rentals:</span>
                                <span className="font-mono font-bold text-white">LKR {formatLKR(calculations.totalFixedRental)}</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-300">
                                <span>Total Outbound Call Usage:</span>
                                <span className="font-mono font-bold text-white">LKR {formatLKR(calculations.totalUsageAmount)}</span>
                            </div>
                            <div className="h-px bg-slate-700 my-2"></div>
                        </div>

                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                                    TOTAL INVOICE AMOUNT
                                </p>
                                <p className="text-xs text-slate-400">Inclusive of all active services</p>
                            </div>
                            <div className="text-right">
                                <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight">
                                    LKR {formatLKR(calculations.grandTotal)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bank Account Details & Payment Section */}
                <div className="bg-gradient-to-br from-slate-50 to-indigo-50/40 p-6 rounded-2xl border border-indigo-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <CreditCard className="text-indigo-600" size={18} />
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                                Bank Transfer & Payment Details
                            </h4>
                        </div>
                        <div className="text-xs text-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 pt-1 font-medium">
                            <p><span className="text-slate-500 font-normal">Bank Name:</span> <span className="font-bold text-slate-900">{bankDetails.bankName}</span></p>
                            <p><span className="text-slate-500 font-normal">Account Number:</span> <span className="font-bold font-mono text-indigo-900 text-sm">{bankDetails.accountNumber}</span></p>
                            <p><span className="text-slate-500 font-normal">Branch:</span> <span className="font-bold text-slate-900">{bankDetails.branch}</span></p>
                            <p><span className="text-slate-500 font-normal">Account Holder:</span> <span className="font-bold text-slate-900">{bankDetails.accountName}</span></p>
                        </div>
                    </div>

                    <div className="text-left sm:text-right shrink-0">
                        <p className="text-[11px] font-bold text-slate-500">Authorized Signature</p>
                        <p className="font-black text-sm text-indigo-900 tracking-wider mt-1">LUMI AI SOLUTIONS</p>
                        <span className="inline-block text-[9px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full mt-1 border border-emerald-300">
                            Verified System Invoice
                        </span>
                    </div>
                </div>

                {/* Footer Notice */}
                <div className="text-center pt-4 border-t border-slate-100 text-[11px] font-medium text-slate-500 space-y-1">
                    <p className="font-semibold text-slate-700">Auto generated by LUMI AI Solutions System</p>
                    <p>Thank you for choosing LUMI AI Solutions for your enterprise communication & AI infrastructure.</p>
                </div>

            </div>
        </div>
    );
}
