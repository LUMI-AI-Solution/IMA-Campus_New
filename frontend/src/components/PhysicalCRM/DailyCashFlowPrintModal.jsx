import React, { useState, useMemo } from 'react';
import { Printer, X, FileText, CheckSquare, Square, Layers, List } from 'lucide-react';
import { format } from 'date-fns';

export default function DailyCashFlowPrintModal({
  isOpen,
  onClose,
  selectedDate,
  transactions = [],
  summary = { totalIncome: 0, totalExpense: 0, netCash: 0 }
}) {
  const [includeTransactions, setIncludeTransactions] = useState(true);
  const [consolidateFees, setConsolidateFees] = useState(true);
  const [currentCashier] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      return u.name || u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username || '';
    } catch {
      return '';
    }
  });

  const activeItems = useMemo(() => {
    if (!includeTransactions) return [];
    if (!consolidateFees) return transactions;

    const classFeeTxns = [];
    const regFeeTxns = [];
    const otherIncomes = [];
    const expenses = [];

    const isClassFee = (tx) => {
      if (tx.type !== 'INCOME') return false;
      const cat = (tx.category || '').trim().toLowerCase();
      const desc = (tx.description || '').trim().toLowerCase();
      return (
        cat === 'class fee' ||
        cat === 'class fees' ||
        desc.startsWith('class fee') ||
        desc.startsWith('multi-class fee')
      );
    };

    const isRegFee = (tx) => {
      if (tx.type !== 'INCOME') return false;
      const cat = (tx.category || '').trim().toLowerCase();
      const desc = (tx.description || '').trim().toLowerCase();
      return (
        cat === 'registration' ||
        cat === 'registration fee' ||
        cat === 'reg fee' ||
        cat === 'student registration' ||
        desc.startsWith('registration fee')
      );
    };

    transactions.forEach((tx) => {
      if (isClassFee(tx)) {
        classFeeTxns.push(tx);
      } else if (isRegFee(tx)) {
        regFeeTxns.push(tx);
      } else if (tx.type === 'INCOME') {
        otherIncomes.push(tx);
      } else {
        expenses.push(tx);
      }
    });

    const items = [];

    // Consolidated Class Fees (if any)
    if (classFeeTxns.length > 0) {
      const classFeeTotal = classFeeTxns.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      items.push({
        id: 'consolidated-class-fee',
        type: 'INCOME',
        category: 'Class Fee',
        description: 'Class Fees (මුළු පන්ති ගාස්තු එකතුව)',
        subText: `Total Collection (${classFeeTxns.length} ${classFeeTxns.length === 1 ? 'Student Payment' : 'Student Payments'})`,
        amount: classFeeTotal,
        isConsolidated: true,
        count: classFeeTxns.length
      });
    }

    // Consolidated Registration Fees (if any)
    if (regFeeTxns.length > 0) {
      const regFeeTotal = regFeeTxns.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      items.push({
        id: 'consolidated-reg-fee',
        type: 'INCOME',
        category: 'Registration',
        description: 'Registration Fees (මුළු ලියාපදිංචි ගාස්තු එකතුව)',
        subText: `Total Collection (${regFeeTxns.length} ${regFeeTxns.length === 1 ? 'Student Registration' : 'Student Registrations'})`,
        amount: regFeeTotal,
        isConsolidated: true,
        count: regFeeTxns.length
      });
    }

    // Other Incomes (e.g. Tute Sale, Other Income)
    items.push(...otherIncomes);

    // Expenses (Outflows)
    items.push(...expenses);

    return items;
  }, [includeTransactions, consolidateFees, transactions]);

  // Pagination configuration for exact A4 (210mm x 297mm) sheet fit
  // Single page: Needs room for Header + Table + Summary (Total & Net Cash) + Signatures (Max 13 rows)
  // Multi-page Intermediate: Room for Header + Table + Page footer (Max 16 rows)
  // Multi-page Last: Room for Header + Table + Summary + Signatures (Max 12 rows)
  const ROWS_FOR_SINGLE_PAGE = 13;
  const ROWS_ON_LAST_PAGE = 12;
  const ROWS_ON_INTERMEDIATE = 16;

  // Smart page-chunking algorithm
  const pages = useMemo(() => {
    if (!includeTransactions || activeItems.length === 0) {
      // Blank single page template
      return [[]];
    }

    if (activeItems.length <= ROWS_FOR_SINGLE_PAGE) {
      return [activeItems];
    }

    const chunked = [];
    let remaining = [...activeItems];

    while (remaining.length > 0) {
      // If remaining items can all fit onto the last page with totals & signatures
      if (remaining.length <= ROWS_ON_LAST_PAGE) {
        chunked.push(remaining);
        break;
      }

      let chunkSize = ROWS_ON_INTERMEDIATE;
      // If 2 pages remain, balance them evenly so the last page isn't overcrowded
      if (remaining.length <= ROWS_ON_INTERMEDIATE + ROWS_ON_LAST_PAGE) {
        chunkSize = Math.ceil(remaining.length / 2);
      }

      chunked.push(remaining.slice(0, chunkSize));
      remaining = remaining.slice(chunkSize);
    }

    return chunked;
  }, [activeItems, includeTransactions]);

  const displayDateText = useMemo(() => {
    if (!selectedDate) return format(new Date(), 'dd / MM / yyyy');
    if (typeof selectedDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      const [y, m, d] = selectedDate.split('-');
      return `${d} / ${m} / ${y}`;
    }
    const d = new Date(selectedDate);
    return !isNaN(d.getTime()) ? format(d, 'dd / MM / yyyy') : String(selectedDate);
  }, [selectedDate]);

  const totalInflow = useMemo(() => {
    if (!includeTransactions) return 0;
    if (summary && summary.totalIncome > 0) return summary.totalIncome;
    return transactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [includeTransactions, summary, transactions]);

  const totalOutflow = useMemo(() => {
    if (!includeTransactions) return 0;
    if (summary && summary.totalExpense > 0) return summary.totalExpense;
    return transactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [includeTransactions, summary, transactions]);

  const openingBalance = useMemo(() => {
    if (!includeTransactions) return 0;
    return Number(summary?.openingBalance) || 0;
  }, [includeTransactions, summary]);

  const closingBalance = useMemo(() => {
    if (!includeTransactions) return 0;
    if (summary?.closingBalance !== undefined && summary.closingBalance !== null) {
      return Number(summary.closingBalance);
    }
    return openingBalance + totalInflow - totalOutflow;
  }, [includeTransactions, summary, openingBalance, totalInflow, totalOutflow]);

  const netBalance = totalInflow - totalOutflow;
  const totalPages = pages.length;

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-white/20 rounded-3xl p-4 sm:p-6 max-w-4xl w-full text-white shadow-2xl relative space-y-4 max-h-[95vh] flex flex-col font-sans">
        
        {/* Modal Top Bar (Controls - Hidden on Print) */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3 no-print">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white">
                  Daily Cash Flow Sheet (A4 Printable)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {totalPages} {totalPages === 1 ? 'Page' : 'Pages'} (A4)
                </span>
                {includeTransactions && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {consolidateFees 
                      ? `${activeItems.length} ${activeItems.length === 1 ? 'Entry' : 'Entries'} (${transactions.length} Txns Consolidated)`
                      : `${activeItems.length} Transactions (Detailed)`
                    }
                  </span>
                )}
              </div>
              <p className="text-xs text-white/50">
                Official physical ledger format matching IMA cash file records
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Toggle Consolidate vs Detailed Breakdown */}
            {includeTransactions && (
              <button
                type="button"
                onClick={() => setConsolidateFees(!consolidateFees)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border cursor-pointer ${
                  consolidateFees
                    ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/40 hover:bg-emerald-600/40'
                    : 'bg-amber-600/30 text-amber-300 border-amber-500/40 hover:bg-amber-600/40'
                }`}
                title={consolidateFees ? "Showing consolidated category totals. Click to switch to detailed student breakdown." : "Showing individual student breakdown. Click to consolidate by category totals."}
              >
                {consolidateFees ? <Layers size={14} /> : <List size={14} />}
                <span>{consolidateFees ? 'Consolidated Fees' : 'Detailed Breakdown'}</span>
              </button>
            )}

            {/* Toggle Fill vs Blank */}
            <button
              type="button"
              onClick={() => setIncludeTransactions(!includeTransactions)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border cursor-pointer ${
                includeTransactions
                  ? 'bg-blue-600/30 text-blue-300 border-blue-500/40'
                  : 'bg-white/10 text-white/70 border-white/15'
              }`}
              title="Toggle between populated daily report and blank printable ledger template"
            >
              {includeTransactions ? <CheckSquare size={14} /> : <Square size={14} />}
              <span>{includeTransactions ? 'Populated Report' : 'Blank Template'}</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer active:scale-95"
            >
              <Printer size={15} />
              <span>Print A4 ({totalPages} {totalPages === 1 ? 'Page' : 'Pages'})</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-white p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Live A4 Sheet Preview Container (Scrollable on screen, Full page on Print) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-950 p-2 sm:p-6 rounded-2xl border border-white/10">
          
          <div id="daily-cashflow-print-container" className="flex flex-col items-center gap-8 w-full">
            {pages.map((pageItems, pageIdx) => {
              const pageNumber = pageIdx + 1;
              const isLastPage = pageNumber === totalPages;

              // Calculate row fillers to achieve consistent ruled ledger look
              const targetMinRows = totalPages === 1 ? 12 : isLastPage ? 8 : 14;
              const emptyRowsCount = Math.max(0, targetMinRows - pageItems.length);
              const emptyRows = Array.from({ length: emptyRowsCount });

              return (
                <div key={`a4-page-${pageIdx}`} className="a4-page-wrapper w-full flex flex-col items-center">
                  
                  {/* On-screen Page Badge (Hidden on print) */}
                  <div className="no-print mb-2 text-xs font-bold text-white/60 flex items-center gap-2">
                    <span className="bg-white/10 px-3 py-1 rounded-full border border-white/15 text-white/90">
                      📄 Page {pageNumber} of {totalPages}
                    </span>
                    {!isLastPage && (
                      <span className="text-emerald-400/90 text-xs font-semibold">
                        (Continued on Page {pageNumber + 1} ➔)
                      </span>
                    )}
                    {isLastPage && totalPages > 1 && (
                      <span className="text-blue-400/90 text-xs font-semibold">
                        (Final Page - Summary & Signatures)
                      </span>
                    )}
                  </div>

                  {/* THE PHYSICAL A4 PAGE */}
                  <div 
                    className="a4-page w-full max-w-[210mm] bg-white text-black shadow-2xl font-sans rounded-sm flex flex-col justify-between"
                    style={{ 
                      width: '210mm',
                      minHeight: '297mm',
                      height: '297mm',
                      padding: '12mm 15mm',
                      boxSizing: 'border-box',
                      fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif"
                    }}
                  >
                    {/* Page Header + Table Content */}
                    <div>
                      {/* Header: Logo on Left, Date on Right */}
                      <div className="flex justify-between items-start mb-4">
                        {/* Logo Box */}
                        <div className="flex items-center gap-3">
                          <div className="border border-gray-400 p-2 rounded-md bg-gray-50 flex items-center gap-2 shadow-sm">
                            <img 
                              src="/logo.png" 
                              alt="IMA Logo" 
                              className="h-9 w-auto object-contain" 
                              onError={(e) => { e.target.style.display = 'none'; }} 
                            />
                            <div>
                              <h1 className="text-lg font-black text-gray-900 tracking-tight leading-none">IMA</h1>
                              <p className="text-[10px] font-bold text-gray-700 tracking-tight uppercase">
                                IMA Institute of Higher Education, Malabe
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Date & Page Header */}
                        <div className="text-right pt-1">
                          <div className="text-xs font-bold text-gray-900 flex items-center justify-end gap-1.5">
                            <span>Date -:</span>
                            <span className="font-extrabold border-b border-dotted border-gray-800 pb-0.5 px-3 min-w-[120px] text-center">
                              {includeTransactions ? displayDateText : '.......................................'}
                            </span>
                          </div>
                          {totalPages > 1 && (
                            <div className="text-[10px] font-bold text-gray-500 mt-1">
                              Page {pageNumber} of {totalPages} {!isLastPage ? '(Continued)' : '(Final Sheet)'}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Main Cash Flow Table (Description | Inflow | Outflow) */}
                      <table className="w-full border-collapse border-2 border-black text-xs">
                        <thead>
                          <tr className="bg-gray-300 text-gray-900 font-extrabold border-b-2 border-black text-center">
                            <th className="py-2 px-3 border-r-2 border-black text-left w-[62%] font-black text-xs uppercase tracking-wider">
                              Description
                            </th>
                            <th className="py-2 px-3 border-r-2 border-black text-center w-[19%] font-black text-xs uppercase tracking-wider">
                              Inflow
                            </th>
                            <th className="py-2 px-3 text-center w-[19%] font-black text-xs uppercase tracking-wider">
                              Outflow
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/80">
                          {/* Transaction Rows for this specific page */}
                          {pageItems.map((tx, idx) => {
                            const isInflow = tx.type === 'INCOME';
                            const isOutflow = tx.type === 'EXPENSE';
                            const amountStr = tx.amount ? tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';
                            const descText = tx.description || tx.category || 'Transaction';
                            const studentInfo = tx.student ? ` [${tx.student.studentName || `${tx.student.firstName || ''} ${tx.student.lastName || ''}`.trim()} - ${tx.student.studentId}]` : '';

                            return (
                              <tr key={tx.id || idx} className="h-7 border-b border-black">
                                <td className="py-1 px-3 border-r-2 border-black text-gray-900 font-medium leading-tight text-[11px]">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className={tx.isConsolidated ? "font-bold text-gray-950 text-[11.5px]" : ""}>
                                      {descText}
                                    </span>
                                    {tx.isConsolidated && (
                                      <span className="text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded bg-gray-200 border border-gray-400 text-gray-800 shrink-0">
                                        Category Total
                                      </span>
                                    )}
                                  </div>
                                  {tx.subText && (
                                    <span className="text-[10px] text-gray-600 font-semibold block">
                                      {tx.subText}
                                    </span>
                                  )}
                                  {studentInfo && <span className="text-[10px] text-gray-700 font-semibold block">{studentInfo}</span>}
                                </td>
                                <td className="py-1 px-3 border-r-2 border-black text-right font-bold text-gray-900 tabular-nums text-[11px]">
                                  {isInflow ? amountStr : ''}
                                </td>
                                <td className="py-1 px-3 text-right font-bold text-gray-900 tabular-nums text-[11px]">
                                  {isOutflow ? amountStr : ''}
                                </td>
                              </tr>
                            );
                          })}

                          {/* Empty Ruled Rows to give standard ledger format */}
                          {emptyRows.map((_, i) => (
                            <tr key={`empty-${pageIdx}-${i}`} className="h-7 border-b border-black">
                              <td className="py-1 px-3 border-r-2 border-black">&nbsp;</td>
                              <td className="py-1 px-3 border-r-2 border-black">&nbsp;</td>
                              <td className="py-1 px-3">&nbsp;</td>
                            </tr>
                          ))}

                          {/* Intermediate Page Footer Row */}
                          {!isLastPage && (
                            <tr className="bg-gray-100 font-bold border-t-2 border-black h-8 text-[11px]">
                              <td colSpan={3} className="py-1.5 px-3 text-center text-gray-700 italic tracking-wider font-semibold">
                                -- Continued on Page {pageNumber + 1} --
                              </td>
                            </tr>
                          )}

                          {/* Summary Rows (ONLY on the Final Page) */}
                          {isLastPage && includeTransactions && (
                            <>
                              <tr className="bg-gray-50 font-bold border-t-2 border-black h-8 text-xs">
                                <td className="py-1.5 px-3 border-r-2 border-black text-right uppercase tracking-wider font-bold text-gray-800">
                                  OPENING BALANCE (ආරම්භක ශේෂය):
                                </td>
                                <td colSpan={2} className="py-1.5 px-3 text-right font-black text-xs tabular-nums text-gray-900">
                                  Rs. {openingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>

                              <tr className="bg-gray-100 font-black border-t border-black h-8 text-xs">
                                <td className="py-1.5 px-3 border-r-2 border-black text-right uppercase tracking-wider font-black">
                                  DAY'S TOTAL (එදින මුළු ලැබීම් හා ගෙවීම්):
                                </td>
                                <td className="py-1.5 px-3 border-r-2 border-black text-right font-black tabular-nums">
                                  {totalInflow > 0 ? `Rs. ${totalInflow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '0.00'}
                                </td>
                                <td className="py-1.5 px-3 text-right font-black tabular-nums">
                                  {totalOutflow > 0 ? `Rs. ${totalOutflow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '0.00'}
                                </td>
                              </tr>

                              <tr className="bg-gray-200 font-black border-t border-black h-8 text-xs">
                                <td className="py-1.5 px-3 border-r-2 border-black text-right uppercase tracking-wider font-black">
                                  CLOSING CASH IN HAND (අතැති අවසාන ශේෂය):
                                </td>
                                <td colSpan={2} className="py-1.5 px-3 text-center font-black text-xs tabular-nums">
                                  Rs. {closingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            </>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Page Footer Section */}
                    <div className="mt-4">
                      {isLastPage ? (
                        <>
                          {/* Signatures on the final page */}
                          <div className="flex justify-between items-end mb-4 px-2">
                            {/* Left: Management Signature */}
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-gray-900" style={{ fontFamily: "'Noto Sans Sinhala', sans-serif" }}>
                                මුදල් භාර ගත් බවට අත්සන
                              </p>
                              <div className="pt-7 border-b border-dotted border-gray-800 w-52"></div>
                              <p className="text-xs font-black text-gray-900 mt-1" style={{ fontFamily: "'Noto Sans Sinhala', sans-serif" }}>
                                IMA කළමනාකාරීත්වය
                              </p>
                            </div>

                            {/* Right: Cashier / Handover Signature */}
                            <div className="space-y-1 text-right">
                              <p className="text-xs font-bold text-gray-900" style={{ fontFamily: "'Noto Sans Sinhala', sans-serif" }}>
                                මුදල් භාර දුන් බවට අත්සන (Cashier)
                              </p>
                              <div className="pt-7 border-b border-dotted border-gray-800 w-52 ml-auto"></div>
                              <p className="text-xs font-bold text-gray-700 mt-1">
                                {currentCashier || 'Staff Signature'}
                              </p>
                            </div>
                          </div>

                          {/* Footer Line & Campus Subtitle */}
                          <div className="border-t-2 border-gray-800 pt-2 flex justify-between items-center text-[10px] font-bold text-gray-700 tracking-wider">
                            <span>IMA INSTITUTE OF HIGHER EDUCATION - MALABE</span>
                            <span className="tabular-nums font-mono text-[11px]">
                              Page {pageNumber} of {totalPages}
                            </span>
                          </div>
                        </>
                      ) : (
                        /* Intermediate Page Footer (No signature block, just continuation line) */
                        <div className="border-t-2 border-gray-800 pt-2 flex justify-between items-center text-[10px] font-bold text-gray-700 tracking-wider">
                          <span>IMA INSTITUTE OF HIGHER EDUCATION - MALABE</span>
                          <span className="tabular-nums font-mono text-[11px]">
                            Page {pageNumber} of {totalPages}
                          </span>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>

        </div>

      </div>

      {/* Print-specific style */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0 !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          body * {
            visibility: hidden !important;
          }
          #daily-cashflow-print-container, #daily-cashflow-print-container * {
            visibility: visible !important;
          }
          #daily-cashflow-print-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            display: block !important;
            z-index: 99999999 !important;
          }
          .a4-page-wrapper {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }
          .a4-page {
            width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            margin: 0 auto !important;
            padding: 12mm 15mm !important;
            box-sizing: border-box !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            background: white !important;
            color: black !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            overflow: hidden !important;
          }
          .a4-page-wrapper:last-child .a4-page {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
