import React, { useEffect } from 'react';
import { Printer, X, CheckCircle2, User, BookOpen, Calendar, CreditCard, Sparkles } from 'lucide-react';
import { printThermalReceipt } from '../../utils/thermalReceiptPrinter';
import toast from 'react-hot-toast';

export default function ThermalReceiptModal({
  isOpen,
  onClose,
  receiptData,
  autoPrint = false
}) {
  useEffect(() => {
    if (isOpen && autoPrint && receiptData) {
      const timer = setTimeout(() => {
        handleDirectPrint();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoPrint, receiptData]);

  if (!isOpen || !receiptData) return null;

  const handleDirectPrint = async () => {
    const success = await printThermalReceipt(receiptData);
    if (success) {
      toast.success('Sent to 80mm receipt printer!', { icon: '🖨️' });
    }
  };

  const {
    receiptNo = `REC-${Date.now().toString().slice(-6)}`,
    studentId = '-',
    studentName = 'Student',
    guardianPhone = '',
    className = 'Class Fee',
    month = '',
    cardType = 'FULL',
    paymentMethod = 'CASH',
    paidDate = new Date(),
    cashierName = 'Cashier / Staff'
  } = receiptData;

  const displayAmount = receiptData.totalAmount !== undefined ? receiptData.totalAmount : (receiptData.amount || 0);
  const displayExpectedFee = receiptData.expectedFee !== undefined ? receiptData.expectedFee : null;
  const displayDueAmount = receiptData.dueAmount !== undefined ? receiptData.dueAmount : 0;
  const dateStr = paidDate instanceof Date ? paidDate.toLocaleString() : String(paidDate);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#12131e] border border-white/20 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col text-white relative">
        
        {/* Header */}
        <div className="p-4 px-6 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Printer size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold">80mm Thermal Receipt</h3>
              <p className="text-[11px] text-white/50">Xprinter XP-80C Thermal POS Slip</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-xl transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Realistic 80mm Thermal Slip Preview */}
        <div className="p-5 overflow-y-auto max-h-[60vh] bg-gradient-to-b from-[#0e0f17] to-[#161724] flex justify-center">
          <div className="w-[300px] bg-white text-black p-4 rounded-sm shadow-2xl text-[11px] leading-tight select-none border-t-4 border-dashed border-neutral-400 relative font-sans">
            
            {/* Institute Brand */}
            <div className="text-center pb-2">
              <div className="flex justify-center mb-1">
                <img src="/logo.png" alt="IMA Logo" className="h-9 w-auto object-contain filter grayscale contrast-125" onError={(e) => e.target.style.display='none'} />
              </div>
              <div className="text-sm font-black tracking-wider uppercase">IMA CAMPUS</div>
              <div className="text-[10px] font-bold text-neutral-800">Higher Education Center</div>
              <div className="text-[9px] text-neutral-600 font-medium">Hotline: 0716909030 | www.imacampus.online</div>
              <div className="text-[11px] font-extrabold mt-1.5 uppercase border-y border-black py-0.5">OFFICIAL PAYMENT RECEIPT</div>
            </div>

            {/* Meta */}
            <div className="space-y-0.5 text-[10px] my-2 border-b border-dashed border-neutral-400 pb-2">
              <div className="flex justify-between">
                <span className="text-neutral-600">Receipt No:</span>
                <span className="font-bold">{receiptNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Date:</span>
                <span>{dateStr}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Cashier:</span>
                <span className="font-bold">{cashierName}</span>
              </div>
            </div>

            {/* Student Info */}
            <div className="space-y-0.5 text-[10px] my-2 border-b border-dashed border-neutral-400 pb-2">
              <div className="flex justify-between">
                <span className="text-neutral-600">Student ID:</span>
                <span className="font-bold">{studentId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Student Name:</span>
                <span className="font-bold">{studentName}</span>
              </div>
              {guardianPhone && (
                <div className="flex justify-between">
                  <span className="text-neutral-600">Contact:</span>
                  <span>{guardianPhone}</span>
                </div>
              )}
            </div>

            {/* Items */}
            <div className="my-2 border-b-2 border-dashed border-black pb-2">
              <div className="text-[10px] font-bold uppercase mb-1">Items Paid:</div>
              {receiptData.items && receiptData.items.length > 0 ? (
                receiptData.items.map((it, i) => {
                  let cleanItemDesc = it.description || className;
                  cleanItemDesc = cleanItemDesc.replace(/^Class Fee\s*(\([^\)]+\))?\s*-\s*/i, '').trim() || cleanItemDesc;
                  const isSpecial = it.cardType && (it.cardType.includes('HALF') || it.cardType.includes('FREE'));
                  return (
                    <div key={i} className="mb-1.5">
                      <div className="flex justify-between font-bold text-[11px] items-start gap-2">
                        <span className="leading-tight flex-1">{cleanItemDesc}</span>
                        <span className="shrink-0 whitespace-nowrap">Rs. {Number(it.amount !== undefined ? it.amount : displayAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="text-[9px] text-neutral-700 mt-0.5">
                        {it.month ? `Month: ${it.month}` : (month ? `Month: ${month}` : '')}{isSpecial ? ` | [${it.cardType.includes('HALF') ? 'HALF CARD' : 'FREE CARD'}]` : ''}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div>
                  <div className="flex justify-between font-bold text-[11px] items-start gap-2">
                    <span className="leading-tight flex-1">{String(className).replace(/^Class Fee\s*(\([^\)]+\))?\s*-\s*/i, '').trim()}</span>
                    <span className="shrink-0 whitespace-nowrap">Rs. {Number(displayAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="text-[9px] text-neutral-700 mt-0.5">
                    {month ? `Month: ${month}` : ''}{cardType && (cardType.includes('HALF') || cardType.includes('FREE')) ? ` | [${cardType.includes('HALF') ? 'HALF CARD' : 'FREE CARD'}]` : ''}
                  </div>
                </div>
              )}
            </div>

            {/* Total */}
            <div className="my-2 space-y-1">
              <div className="flex justify-between text-xs font-black">
                <span>TOTAL PAID:</span>
                <span>Rs. {Number(displayAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-neutral-600">Status:</span>
                <span className={`font-bold ${receiptData.status === 'PARTIAL' ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {receiptData.status === 'PARTIAL' ? 'PARTIAL PAYMENT' : (receiptData.status || 'PAID ✓')}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-[8px] text-neutral-600 border-t border-dashed border-neutral-400 pt-2 mt-2">
              <div>Keep this receipt for entrance & card verification.</div>
              <div className="font-bold text-neutral-800 mt-0.5">Thank you for studying with IMA Campus!</div>
            </div>

          </div>
        </div>

        {/* Actions Footer */}
        <div className="p-4 bg-white/5 border-t border-white/10 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white/70 hover:text-white bg-white/5 hover:bg-white/10 transition-all"
          >
            Close
          </button>
          
          <button
            type="button"
            onClick={handleDirectPrint}
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Printer size={16} />
            <span>Print Receipt (Xprinter 80mm)</span>
          </button>
        </div>

      </div>
    </div>
  );
}
