import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from '../../../api/axios';
import { Loader2, CheckCircle, Clock, Wallet, CalendarDays, AlertTriangle, UploadCloud, X, Camera, MonitorPlay, Paperclip, Info } from 'lucide-react';
import toast from 'react-hot-toast';

import correctCdmImg from '../../../assets/correct-cdm.jpg';
import wrongCdmImg from '../../../assets/wrong-cdm.jpg';
import correctReceiptImg from '../../../assets/correct-receipt.jpg';
import wrongReceiptImg from '../../../assets/wrong-receipt.jpg';

export default function PaymentHistory() {
    const [payments, setPayments] = useState({ upcoming: [], completed: [] });
    const [loading, setLoading] = useState(true);

    const [payModal, setPayModal] = useState(null);
    const [slipFiles, setSlipFiles] = useState([]);
    const [remark, setRemark] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSlipInstructions, setShowSlipInstructions] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('slip');

    const backendBaseUrl = window.location.protocol === 'https:'
        ? 'https://imacampus.online'
        : 'http://72.62.249.211:5000';

    const fetchPayments = async () => {
        setLoading(true);
        try {
            let res;
            try { res = await axios.get('/student/my-payments'); } 
            catch (err) { res = await axios.get('/payments/my-payments'); }

            const all = res?.data?.oldPayments || res?.data || [];
            const upcomingList = [];
            const historyList = [];

            all.forEach(p => {
                const isRejectedOrTrashedDue = (p.status === 2 || p.status === 5) && (p.dueDate || p.method === 'Upcoming');

                if (isRejectedOrTrashedDue) {
                    upcomingList.push(p);
                } else if (p.status === 5) {
                    return; // Ignore general trashed payments
                } else {
                    const isVerifying = p.status === -1 || (p.status === 0 && p.method === 'Slip');
                    
                    if (p.status === 1 || p.status === 2 || p.status === 3 || p.status === 4 || isVerifying) {
                        p.displayStatus = (p.status === 1 || p.status === 4) ? 'Approved' 
                                         : p.status === 3 ? 'Expired'
                                         : p.status === 2 ? 'Rejected' 
                                         : 'Verifying';
                        historyList.push(p);
                    } else {
                        upcomingList.push(p);
                    }
                }
            });

            setPayments({ upcoming: upcomingList, completed: historyList });
        } catch (error) { 
            console.error(error); 
        } finally { 
            setLoading(false); 
        }
    };

    useEffect(() => { fetchPayments(); }, []);

    const formatDate = (ds) => ds ? new Date(ds).toISOString().split('T')[0] : 'N/A';

    const handleFileChange = (e) => {
        const newFiles = Array.from(e.target.files);
        const totalFiles = [...slipFiles, ...newFiles];
        
        if (totalFiles.length > 4) {
            toast.error("You can only upload up to 4 slips.");
            setSlipFiles(totalFiles.slice(0, 4));
        } else {
            setSlipFiles(totalFiles);
        }
    };

    const removeFile = (indexToRemove) => {
        setSlipFiles(slipFiles.filter((_, index) => index !== indexToRemove));
    };

    const openSlipInstructions = () => setShowSlipInstructions(true);

    const confirmSlipInstructions = () => {
        const fileInput = document.getElementById('slip-upload-due');
        if (fileInput) fileInput.click();
        setShowSlipInstructions(false); 
    };

    const openSlipsInNewTab = (slips) => {
        if (!slips || slips.length === 0) return toast.error("No slips to view.");

        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const baseUrl = isLocalhost ? 'http://localhost:5000' : 'https://imacampus.online';

        const slipsHtml = slips.map((imgStr, index) => {
            const fileUrl = `${baseUrl}/api/storage/documents/${imgStr}`;
            const isPdf = imgStr.toLowerCase().endsWith('.pdf');
            if (isPdf) {
                return `
                <div class="slip-card">
                    <div class="title">Document ${index + 1} (PDF)</div>
                    <embed src="${fileUrl}" type="application/pdf" width="100%" height="600px" />
                    <a href="${fileUrl}" target="_blank" class="download-btn">Open PDF in New Tab</a>
                </div>`;
            } else {
                return `
                <div class="slip-card">
                    <div class="title">Image ${index + 1}</div>
                    <img src="${fileUrl}" alt="Slip ${index + 1}"/>
                    <a href="${fileUrl}" target="_blank" class="download-btn">View Full Image</a>
                </div>`;
            }
        }).join('');

        const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>My Uploaded Slips</title>
            <style>
                body { background-color: #0f172a; color: white; font-family: system-ui, -apple-system, sans-serif; padding: 2rem; display: flex; flex-direction: column; align-items: center; gap: 2rem; margin: 0; }
                .header { text-align: center; margin-bottom: 1rem; }
                .header h2 { color: #10b981; margin: 0; font-size: 2rem; }
                .slip-card { background: #1e293b; border: 1px solid #334155; border-radius: 1rem; padding: 1.5rem; width: 100%; max-width: 800px; display: flex; flex-direction: column; align-items: center; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.5); }
                img { max-width: 100%; height: auto; border-radius: 0.5rem; border: 1px solid #334155; }
                embed { border-radius: 0.5rem; border: 1px solid #334155; background-color: white; }
                .title { width: 100%; text-align: left; margin-bottom: 1rem; font-size: 1rem; font-weight: bold; color: #cbd5e1; border-bottom: 1px solid #334155; padding-bottom: 0.5rem; }
                .download-btn { margin-top: 1rem; padding: 0.5rem 1rem; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 0.5rem; font-size: 0.875rem; font-weight: bold; }
                .download-btn:hover { background-color: #2563eb; }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>My Uploaded Slips</h2>
            </div>
            ${slipsHtml}
        </body>
        </html>
        `;

        const newWindow = window.open('', '_blank');
        if (newWindow) {
            newWindow.document.write(htmlContent);
            newWindow.document.close();
        } else {
            toast.error("Popup blocked! Please allow popups for this site.");
        }
    };

    const handlePayDue = async (e) => {
        e.preventDefault();

        if (paymentMethod === 'payhere') {
            if (typeof window.payhere === 'undefined') {
                return toast.error("PayHere integration is missing! Please refresh the page.");
            }

            setIsSubmitting(true);

            try {
                const orderId = payModal.id.toString();
                const hashRes = await axios.post('/student/payhere-hash', {
                    amount: parseFloat(payModal.amount).toFixed(2),
                    orderId: orderId,
                    currency: "LKR"
                });

                const isSandbox = import.meta.env.VITE_PAYHERE_ENV === 'sandbox';
                const backendBaseUrl = window.location.protocol === 'https:'
                    ? 'https://imacampus.online'
                    : 'http://72.62.249.211:5000';

                const payment = {
                    sandbox: isSandbox,
                    merchant_id: import.meta.env.VITE_PAYHERE_MERCHANT_ID || "222646",
                    return_url: window.location.origin + "/student/dashboard",
                    cancel_url: window.location.origin + "/student/dashboard",
                    notify_url: `${backendBaseUrl}/api/student/payhere-notify`,
                    order_id: orderId,
                    items: `Due: ${payModal.courseName}`,
                    amount: parseFloat(payModal.amount).toFixed(2),
                    currency: "LKR",
                    hash: hashRes.data.hash || "",
                    first_name: "Student",
                    last_name: "Name",
                    email: "student@imacampus.lk",
                    phone: "0770000000",
                    address: "Sri Lanka",
                    city: "Colombo",
                    country: "Sri Lanka"
                };

                window.payhere.onCompleted = async function onCompleted(orderId) {
                    toast.success("Payment successful! Synchronizing with dashboard...");
                    try {
                        await axios.post('/student/pay-due-online', {
                            paymentId: payModal.id,
                            orderId: orderId
                        });
                        toast.success("Payment updated successfully!");
                        setPayModal(null);
                        setSlipFiles([]);
                        setRemark('');
                        setPaymentMethod('slip');
                        await fetchPayments();
                    } catch (syncErr) {
                        console.error("Dashboard sync error:", syncErr);
                        toast.error("Payment succeeded but failed to instantly sync. The backend will verify it shortly via webhook.");
                        setPayModal(null);
                        setSlipFiles([]);
                        setRemark('');
                        setPaymentMethod('slip');
                        await fetchPayments();
                    } finally {
                        setIsSubmitting(false);
                    }
                };

                window.payhere.onDismissed = function onDismissed() {
                    toast.error("Payment dismissed.");
                    setIsSubmitting(false);
                };

                window.payhere.onError = function onError(error) {
                    toast.error("Payment Error: " + error);
                    setIsSubmitting(false);
                };

                window.payhere.startPayment(payment);

            } catch (error) {
                console.error("PayHere Dues Error:", error);
                toast.error("Failed to initiate card payment.");
                setIsSubmitting(false);
            }

        } else {
            // 🔥 SLIP PAYMENT
            if (slipFiles.length === 0) return toast.error("Please upload your bank slip(s).");
            
            setIsSubmitting(true);
            const formData = new FormData();
            formData.append('paymentId', payModal.id); 
            if (remark) formData.append('remark', remark);

            slipFiles.forEach(file => {
                formData.append('slipImages', file);
            });

            try {
                await axios.post('/student/upload-due-slip', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
                toast.success("Slip uploaded successfully! Awaiting verification.");
                setPayModal(null);
                setSlipFiles([]);
                setRemark('');
                await fetchPayments();
            } catch (error) {
                toast.error("Failed to upload slip. Try again.");
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-red-500" size={40}/></div>;

    return (
        <div className="w-full max-w-6xl mx-auto animate-fade-in pb-20">
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-white/10">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                    <Wallet size={30} className="text-red-500"/>
                </div>
                <div>
                    <h2 className="text-2xl md:text-4xl font-extrabold text-white tracking-wider uppercase">My Payments</h2>
                    <p className="text-white/60 mt-1 text-xs md:text-sm font-medium">Track your upcoming dues and payment history.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* UPCOMING / PENDING SECTION */}
                <div className="glass-card rounded-[2rem] p-6 md:p-8 border border-white/10 shadow-2xl h-max">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3"><Clock className="text-orange-400"/> Upcoming / Pending</h3>
                    <div className="space-y-4">
                        {payments.upcoming.length === 0 ? (
                            <div className="text-center py-10 bg-white/5 rounded-2xl border border-white/10">
                                <CheckCircle size={40} className="mx-auto text-emerald-500/50 mb-3"/>
                                <p className="text-white/50 font-bold">No pending payments.</p>
                            </div>
                        ) : payments.upcoming.map((p, idx) => {
                            let isLate = p.dueDate ? new Date(p.dueDate) < new Date() : false;
                            if (p.status === 3) isLate = true;

                            return (
                                <div key={idx} className={`bg-black/30 border p-5 md:p-6 rounded-2xl flex flex-col relative overflow-hidden transition-all ${isLate ? 'border-red-500/50' : 'border-white/10'}`}>
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500"></div>
                                    <div className="pl-3">
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                                            <h4 className="text-base md:text-lg font-bold text-white">{p.courseName}</h4>
                                            <div className="flex gap-2 flex-wrap shrink-0">
                                                {p.isInstallment && p.installmentNo && (
                                                    <span className="text-[10px] uppercase font-bold bg-orange-500/20 text-orange-400 px-2.5 py-1 rounded-lg border border-orange-500/30 w-max">
                                                        Phase {p.installmentNo}
                                                    </span>
                                                )}
                                                {(p.status === 2 || p.status === 5) && (
                                                    <span className="text-[10px] uppercase font-bold bg-red-500/20 text-red-400 px-2.5 py-1 rounded-lg border border-red-500/30 w-max animate-pulse">
                                                        Payment Rejected
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <p className={`text-xs mt-2 flex items-center gap-1.5 font-bold ${isLate ? 'text-red-400' : 'text-white/50'}`}>
                                            <CalendarDays size={14}/> 
                                            {p.dueDate ? `Due: ${formatDate(p.dueDate)}` : `Generated: ${formatDate(p.createdDate)}`}
                                            {isLate && <AlertTriangle size={14} className="ml-1"/>}
                                        </p>
                                        
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mt-4 pt-4 border-t border-white/10 gap-4">
                                            <div>
                                                <span className="text-xs font-bold text-white/40 block mb-1 uppercase tracking-widest">Amount Payable</span>
                                                <span className="text-xl md:text-3xl font-black text-white">LKR {parseFloat(p.amount).toFixed(2)}</span>
                                            </div>
                                            <div className="w-full sm:w-auto">
                                                <button onClick={() => setPayModal(p)} className="w-full sm:w-auto bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-lg shadow-red-500/20 transition-transform hover:scale-105 uppercase tracking-widest">
                                                    Pay Now
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* PAYMENT HISTORY SECTION */}
                <div className="glass-card rounded-[2rem] p-6 md:p-8 border border-white/10 shadow-2xl h-max">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3"><CheckCircle className="text-emerald-400"/> Payment History</h3>
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                        {payments.completed.length === 0 ? (
                            <div className="text-center py-10 bg-white/5 rounded-2xl border border-white/10">
                                <p className="text-white/50 font-bold">No history found.</p>
                            </div>
                        ) : payments.completed.map((p, idx) => (
                            <div key={idx} className="bg-white/5 hover:bg-white/10 transition-colors border border-white/10 p-5 rounded-2xl group flex flex-col justify-between">
                                <div className="flex justify-between items-start gap-4 mb-2">
                                    <div>
                                        <h4 className="text-sm font-bold text-white mb-1 group-hover:text-red-400 transition-colors">{p.courseName}</h4>
                                        {p.isInstallment && p.installmentNo && (
                                            <span className="text-[9px] uppercase font-bold text-white/50 bg-black/40 px-2 py-0.5 rounded border border-white/10 mb-2 inline-block">
                                                Phase {p.installmentNo}
                                            </span>
                                        )}
                                        <p className="text-[10px] text-white/40 font-medium flex items-center gap-1 mt-1"><CalendarDays size={10}/> {formatDate(p.createdDate)}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <span className="text-lg font-black text-white/90 block mb-1">LKR {parseFloat(p.amount).toFixed(2)}</span>
                                        <div className="flex flex-col items-end gap-2 mt-2">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider inline-block border ${
                                                p.displayStatus === 'Approved' ? 'text-emerald-400 border-emerald-400/30 bg-emerald-500/10' :
                                                p.displayStatus === 'Expired' ? 'text-orange-400 border-orange-400/30 bg-orange-500/10' :
                                                p.displayStatus === 'Rejected' ? 'text-red-400 border-red-400/30 bg-red-500/10' :
                                                'text-yellow-400 border-yellow-400/30 bg-yellow-500/10'
                                            }`}>
                                                {p.displayStatus}
                                            </span>
                                            {p.slips && p.slips.length > 0 && (
                                                <button onClick={() => openSlipsInNewTab(p.slips)} className="text-[10px] font-extrabold text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-600 border border-blue-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors">
                                                    View Slip
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* 🔥 NEW: Wallet adjustments indicator 🔥 */}
                                {(p.excessAmount > 0 || p.arrearsAmount > 0) && (
                                    <div className="mt-2 pt-2 border-t border-white/5 text-right flex flex-col gap-1">
                                        {p.excessAmount > 0 && (
                                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded w-max ml-auto border border-emerald-500/20">
                                                Overpaid: +LKR {p.excessAmount} to Wallet
                                            </span>
                                        )}
                                        {p.arrearsAmount > 0 && (
                                            <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded w-max ml-auto border border-red-500/20">
                                                Short Amount: -LKR {p.arrearsAmount} in Wallet
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 🔥 PAY DUE MODAL WITH ADVANCED UPLOAD 🔥 */}
            {payModal && createPortal(
                <div className="fixed inset-0 z-[9999] bg-[#0a0f1c]/95 backdrop-blur-md overflow-y-auto custom-scrollbar">
                    <div className="flex min-h-full items-start justify-center p-4 py-12">
                        <div className="bg-[#15192b] border border-white/10 rounded-[2rem] w-full max-w-md p-6 md:p-8 relative shadow-2xl animate-in zoom-in-95 duration-200 my-auto">
                            <button onClick={() => {setPayModal(null); setSlipFiles([]); setRemark(''); setPaymentMethod('slip');}} className="absolute top-5 right-5 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 p-2.5 rounded-xl transition-all border border-transparent hover:border-red-500/30">
                                <X size={20} strokeWidth={3} />
                            </button>
                            
                            <div className="mb-6 border-b border-white/5 pb-6">
                                <h3 className="text-xl md:text-2xl font-black text-white">Submit Payment</h3>
                                <p className="text-xs text-slate-400 mt-2 font-medium">Select a payment option and complete your transaction.</p>
                            </div>
                            
                            <div className="bg-black/40 border border-white/5 rounded-2xl p-5 text-center mb-6 shadow-inner">
                                <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1">Amount Due</p>
                                <p className="text-3xl font-black text-red-500">LKR {parseFloat(payModal.amount).toLocaleString()}</p>
                                <p className="text-xs font-bold text-white mt-2">{payModal.courseName}</p>
                            </div>

                            {/* Payment Method Selector Tabs */}
                            <div className="flex gap-2 bg-black/30 p-1 rounded-2xl border border-white/10 mb-6 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod('slip')}
                                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors ${paymentMethod === 'slip' ? 'bg-white/20 text-white border border-white/10 shadow' : 'text-white/40 hover:text-white/80'}`}
                                >
                                    Bank Slip
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod('payhere')}
                                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors ${paymentMethod === 'payhere' ? 'bg-white/20 text-white border border-white/10 shadow' : 'text-white/40 hover:text-white/80'}`}
                                >
                                    Online / Card
                                </button>
                            </div>

                            <form onSubmit={handlePayDue}>
                                {paymentMethod === 'payhere' ? (
                                    <div className="bg-gradient-to-br from-indigo-600/10 to-purple-600/10 border border-indigo-500/25 rounded-[1.5rem] p-6 text-center mb-6 backdrop-blur-sm">
                                        <div className="w-16 h-16 mx-auto mb-4 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20 text-indigo-400">
                                            <Wallet size={32} />
                                        </div>
                                        <h4 className="text-white font-extrabold text-sm mb-1">Pay Instantly with PayHere</h4>
                                        <p className="text-xs text-white/60 leading-relaxed mb-4">
                                            We support Visa, MasterCard, AMEX, Frimi, Genie, eZ Cash, mCash, and Internet Banking.
                                        </p>
                                        <div className="flex justify-center gap-2 text-[10px] uppercase font-extrabold tracking-widest text-indigo-400 bg-indigo-500/5 py-2 px-4 rounded-xl border border-indigo-500/10 w-max mx-auto">
                                            <span>Secure Gateway</span>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="border-2 border-dashed border-white/20 bg-white/5 rounded-[1.5rem] p-6 text-center hover:border-red-500/50 hover:bg-red-500/5 transition-colors cursor-pointer mb-4 group relative" onClick={openSlipInstructions}>
                                            <div className="absolute top-3 right-3 bg-blue-500 text-white p-1.5 rounded-full"><Info size={14}/></div>
                                            <input type="file" id="slip-upload-due" className="hidden" multiple accept="image/*,application/pdf" capture="environment" onChange={handleFileChange} />
                                            <div className="flex flex-col items-center w-full">
                                                <div className="flex gap-3 mb-3 text-white/30 group-hover:text-red-500 transition-colors">
                                                    <UploadCloud size={32} />
                                                    <Camera size={32} />
                                                </div>
                                                <span className="text-white font-bold text-sm mb-1">
                                                    {slipFiles.length > 0 ? `${slipFiles.length} File(s) Selected` : 'Click to Upload Slip'}
                                                </span>
                                                <span className="text-[10px] text-white/50 font-medium">Max 4 slips. PNG, JPG, PDF</span>
                                            </div>
                                        </div>
                                        
                                        {slipFiles.length > 0 && (
                                            <div className="mb-4 bg-black/30 p-3 rounded-xl border border-white/5 space-y-1.5">
                                                {slipFiles.map((file, i) => (
                                                    <div key={i} className="flex justify-between items-center text-xs">
                                                        <div className="flex items-center gap-2 truncate pr-3">
                                                            <Paperclip size={12} className="text-white/40 shrink-0"/>
                                                            <span className="text-white truncate">{file.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-3 shrink-0">
                                                            <span className="text-white/40">{(file.size / 1024 / 1024).toFixed(1)}MB</span>
                                                            <button type="button" onClick={() => removeFile(i)} className="text-red-400 hover:text-red-300"><X size={14}/></button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}

                                <div className="mb-6">
                                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1 block">Remark (Optional)</label>
                                    <textarea value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Type any message..." rows="2" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-red-500 transition-colors resize-none"></textarea>
                                </div>
                                
                                <button type="submit" disabled={isSubmitting || (paymentMethod === 'slip' && slipFiles.length === 0)} className={`w-full bg-gradient-to-r ${paymentMethod === 'payhere' ? 'from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 border-indigo-500/50 shadow-indigo-500/20' : 'from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 border-red-500/50 shadow-red-500/20'} disabled:opacity-50 text-white font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest border shadow-lg`}>
                                    {isSubmitting ? <Loader2 size={18} className="animate-spin"/> : <CheckCircle size={18}/>} 
                                    {paymentMethod === 'payhere' ? 'Pay Securely' : 'Submit Payment'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* 🔥 SLIP INSTRUCTIONS POPUP 🔥 */}
            {showSlipInstructions && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/95 p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-white/10 p-5 md:p-8 rounded-3xl max-w-2xl w-full shadow-2xl relative overflow-y-auto max-h-[90vh] custom-scrollbar">
                        <h3 className="text-lg md:text-2xl font-extrabold text-white mb-4 md:mb-6 border-b border-white/10 pb-3 md:pb-4">ස්ලිප් පත් උඩුගත කිරීමේ උපදෙස් (Slip Upload Instructions)</h3>
                        
                        <div className="space-y-4 md:space-y-6">
                            <div className="bg-black/50 p-4 md:p-5 rounded-2xl border border-white/5">
                                <h4 className="text-red-400 font-bold mb-2 md:mb-3 flex items-center gap-2 text-sm md:text-base"><Camera size={16}/> බැංකු ස්ලිප් (CDM / Bank Deposit)</h4>
                                <ul className="text-xs md:text-sm text-slate-300 list-disc pl-4 md:pl-5 space-y-1 md:space-y-2 leading-relaxed mb-4">
                                    <li>ස්ලිප් පතෙහි <strong className="text-white">මුලු 4ම (4 corners)</strong> පැහැදිලිව පෙනෙන සේ ඡායාරූපය ගන්න.</li>
                                    <li>ඡායාරූපය <strong className="text-white">බොඳ නොවී ඉතා පැහැදිලිව</strong> තිබිය යුතුය.</li>
                                    <li><strong className="text-white">Reference Number, දිනය සහ වේලාව</strong> හොඳින් කියවිය හැකි විය යුතුය.</li>
                                </ul>
                                <div className="flex gap-2 md:gap-4">
                                    <div className="flex-1 bg-white/5 border border-green-500/50 rounded-xl p-2 md:p-3 text-center flex flex-col justify-between">
                                        <img src={correctCdmImg} className="w-full h-20 md:h-28 object-contain rounded-lg mb-2" alt="Correct"/>
                                        <span className="text-green-400 text-[9px] md:text-xs font-bold uppercase flex justify-center items-center gap-1"><CheckCircle size={10}/> නිවැරදියි (Correct)</span>
                                    </div>
                                    <div className="flex-1 bg-white/5 border border-red-500/50 rounded-xl p-2 md:p-3 text-center flex flex-col justify-between">
                                        <img src={wrongCdmImg} className="w-full h-20 md:h-28 object-contain rounded-lg mb-2 opacity-50" alt="Wrong"/>
                                        <span className="text-red-400 text-[9px] md:text-xs font-bold uppercase flex justify-center items-center gap-1"><X size={10}/> වැරදියි (Incorrect)</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-black/50 p-4 md:p-5 rounded-2xl border border-white/5">
                                <h4 className="text-blue-400 font-bold mb-2 md:mb-3 flex items-center gap-2 text-sm md:text-base"><MonitorPlay size={16}/> Online Transfers / e-Receipts</h4>
                                <ul className="text-xs md:text-sm text-slate-300 list-disc pl-4 md:pl-5 space-y-1 md:space-y-2 leading-relaxed mb-4">
                                    <li><strong className="text-white">Reference Number, දිනය සහ වේලාව</strong> අනිවාර්යයෙන්ම දිස්විය යුතුය.</li>
                                    <li>ස්ක්‍රීන්ෂොට් එක (Screenshot) කපා-කොටා (crop) නොමැතිව <strong className="text-white">සම්පූර්ණයෙන්ම</strong> උඩුගත කරන්න.</li>
                                </ul>
                                 <div className="flex gap-2 md:gap-4">
                                    <div className="flex-1 bg-white/5 border border-green-500/50 rounded-xl p-2 md:p-3 text-center flex flex-col justify-between">
                                        <img src={correctReceiptImg} className="w-full h-20 md:h-28 object-contain rounded-lg mb-2 border border-white/20" alt="Correct"/>
                                        <span className="text-green-400 text-[9px] md:text-xs font-bold uppercase flex justify-center items-center gap-1"><CheckCircle size={10}/> නිවැරදියි (Correct)</span>
                                    </div>
                                    <div className="flex-1 bg-white/5 border border-red-500/50 rounded-xl p-2 md:p-3 text-center flex flex-col justify-between">
                                        <img src={wrongReceiptImg} className="w-full h-20 md:h-28 object-contain rounded-lg mb-2 opacity-50 border border-white/10" alt="Wrong"/>
                                        <span className="text-red-400 text-[9px] md:text-xs font-bold uppercase flex justify-center items-center gap-1"><X size={10}/> වැරදියි (Incorrect)</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 md:mt-8 flex justify-end gap-3 md:gap-4">
                            <button onClick={() => setShowSlipInstructions(false)} className="px-4 md:px-6 py-2.5 md:py-3 rounded-xl bg-white/5 text-white/70 text-xs md:text-sm font-bold hover:bg-white/10 hover:text-white transition-colors">අවලංගු කරන්න (Cancel)</button>
                            <button onClick={confirmSlipInstructions} className="px-4 md:px-6 py-2.5 md:py-3 rounded-xl bg-red-600 text-white text-xs md:text-sm font-bold hover:bg-red-500 shadow-lg shadow-red-500/20 transition-colors">මම තේරුම් ගත්තා (Upload)</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}