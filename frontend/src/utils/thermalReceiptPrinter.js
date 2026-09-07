/**
 * Thermal Receipt Printer Utility for 80mm POS Thermal Printers (e.g. Xprinter XP-80C)
 * Standard roll width: 80mm (approx 72mm printable width)
 */

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function generateThermalReceiptHtml(data = {}) {
  const {
    instituteName = 'IMA CAMPUS',
    instituteTagline = 'Higher Education Center',
    instituteContact = 'Hotline: 0716909030 | www.imacampus.online',
    receiptNo = `REC-${Date.now().toString().slice(-6)}`,
    date = new Date(),
    cashierName = 'Cashier / Staff',
    studentId = '-',
    studentName = 'Student',
    studentPhone = '',
    items = [], // Array of { description, month, cardType, amount }
    totalAmount = null,
    expectedFee = null,
    dueAmount = 0,
    status = 'PAID ✓',
    notes = 'Keep this receipt for entrance & card verification.'
  } = data;

  const displayTotal = totalAmount !== null && totalAmount !== undefined ? totalAmount : (data.amount || 0);

  const formattedDate = date instanceof Date 
    ? date.toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })
    : String(date);

  const formattedTotal = Number(displayTotal).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Receipt - ${escapeHtml(receiptNo)}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0mm;
          }
          @media print {
            html, body {
              width: 76mm;
              margin: 0 auto;
              padding: 2mm 1mm;
              background: #ffffff !important;
              color: #000000 !important;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              font-size: 11.5px;
              line-height: 1.25;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
          body {
            width: 76mm;
            margin: 0 auto;
            padding: 3mm 2mm;
            background: #ffffff;
            color: #000000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            font-size: 11.5px;
            line-height: 1.25;
            box-sizing: border-box;
            -webkit-font-smoothing: antialiased;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .text-left { text-align: left; }
          .bold { font-weight: 700; }
          .logo-box {
            text-align: center;
            margin-bottom: 2px;
          }
          .logo-img {
            max-height: 42px;
            width: auto;
            margin: 0 auto;
            display: inline-block;
            filter: grayscale(100%) contrast(150%);
          }
          .title { font-size: 15px; font-weight: 900; letter-spacing: 0.5px; margin-bottom: 1px; }
          .subtitle { font-size: 10px; font-weight: 600; margin-bottom: 2px; }
          .contact { font-size: 9.5px; margin-bottom: 3px; font-weight: 500; }
          .receipt-heading {
            font-size: 11.5px;
            font-weight: 800;
            margin-top: 3px;
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: 2px 0;
            letter-spacing: 0.5px;
          }
          .divider-double { border-top: 2px dashed #000; margin: 5px 0; }
          .divider-single { border-top: 1px dashed #000; margin: 3px 0; }
          .row { display: flex; justify-content: space-between; margin-bottom: 2px; }
          .item-row { margin-bottom: 4px; }
          .item-desc { font-weight: 700; }
          .item-meta { font-size: 9.5px; color: #111; margin-top: 1px; }
          .grand-total { font-size: 14px; font-weight: 900; margin: 5px 0; }
          .barcode-box {
            margin: 6px auto 3px auto;
            text-align: center;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 2px;
            border: 1px solid #000;
            padding: 3px 8px;
            display: inline-block;
          }
          .footer-note { font-size: 8.5px; line-height: 1.25; text-align: center; margin-top: 5px; }
          .cut-space { height: 20px; }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="text-center">
          <div class="logo-box">
            <img src="/logo.png" class="logo-img" alt="IMA Logo" onerror="this.style.display='none'" />
          </div>
          <div class="title">${escapeHtml(instituteName)}</div>
          <div class="subtitle bold">${escapeHtml(instituteTagline)}</div>
          <div class="contact">${escapeHtml(instituteContact)}</div>
          <div class="receipt-heading">OFFICIAL PAYMENT RECEIPT</div>
        </div>

        <div class="divider-double"></div>

        <!-- Receipt Info -->
        <div class="row">
          <span>Receipt No:</span>
          <span class="bold">${escapeHtml(receiptNo)}</span>
        </div>
        <div class="row">
          <span>Date & Time:</span>
          <span>${escapeHtml(formattedDate)}</span>
        </div>
        <div class="row">
          <span>Cashier/Issued:</span>
          <span class="bold">${escapeHtml(cashierName)}</span>
        </div>

        <div class="divider-single"></div>

        <!-- Student Info -->
        <div class="row">
          <span>Student ID:</span>
          <span class="bold">${escapeHtml(studentId)}</span>
        </div>
        <div class="row">
          <span>Student Name:</span>
          <span class="bold">${escapeHtml(studentName)}</span>
        </div>
        ${studentPhone ? `
        <div class="row">
          <span>Contact No:</span>
          <span>${escapeHtml(studentPhone)}</span>
        </div>` : ''}

        <div class="divider-double"></div>

        <!-- Payment Breakdown -->
        <div style="font-size: 10.5px; margin-bottom: 3px;" class="bold">PAYMENT DETAILS:</div>
        
        ${items.map(item => {
          const isSpecialCard = item.cardType && (
            item.cardType.includes('HALF') || 
            item.cardType.includes('FREE')
          );
          const cardLabel = isSpecialCard ? ` [${item.cardType.includes('HALF') ? 'HALF CARD' : 'FREE CARD'}]` : '';

          let cleanDesc = item.description || 'Class Fee';
          cleanDesc = cleanDesc.replace(/^Class Fee\s*(\([^\)]+\))?\s*-\s*/i, '').trim() || cleanDesc;

          return `
            <div class="item-row">
              <div class="row item-desc" style="align-items: flex-start; gap: 8px;">
                <span style="flex: 1; word-break: normal; overflow-wrap: break-word; font-weight: 700; line-height: 1.2;">${escapeHtml(cleanDesc)}</span>
                <span class="text-right bold" style="white-space: nowrap;">Rs. ${Number(item.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div class="item-meta">
                ${item.month ? `Month: ${escapeHtml(item.month)}` : ''}${cardLabel}
              </div>
            </div>
          `;
        }).join('')}

        <div class="divider-double"></div>

        <!-- Totals -->
        <div class="row grand-total">
          <span>TOTAL PAID:</span>
          <span class="text-right">Rs. ${escapeHtml(formattedTotal)}</span>
        </div>
        <div class="row" style="font-size: 10.5px;">
          <span>Payment Status:</span>
          <span class="bold">${status === 'PARTIAL' ? 'PARTIAL PAYMENT' : (status || 'PAID ✓')}</span>
        </div>

        <div class="divider-single"></div>

        <!-- Footer -->
        <div class="footer-note">
          <div>${escapeHtml(notes)}</div>
          <div style="margin-top: 2px; font-weight: 700;">Thank you for studying with IMA Campus!</div>
        </div>

        <!-- Cutter clearance -->
        <div class="cut-space"></div>
      </body>
    </html>
  `;
}

/**
 * Triggers thermal receipt printing using a hidden iframe
 */
export function printThermalReceipt(receiptData) {
  return new Promise((resolve) => {
    try {
      const htmlContent = generateThermalReceiptHtml(receiptData);

      // Remove existing print iframe if any
      const existingIframe = document.getElementById('thermal-print-iframe');
      if (existingIframe) {
        existingIframe.remove();
      }

      // Create new hidden iframe
      const iframe = document.createElement('iframe');
      iframe.id = 'thermal-print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      iframe.style.zIndex = '-9999';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow || iframe.contentDocument;
      const doc = iframe.contentDocument || iframeDoc.document;

      doc.open();
      doc.write(htmlContent);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          resolve(true);
        } catch (e) {
          console.error('Print iframe error:', e);
          resolve(false);
        }
      }, 250);
    } catch (err) {
      console.error('Failed to trigger receipt print:', err);
      resolve(false);
    }
  });
}
