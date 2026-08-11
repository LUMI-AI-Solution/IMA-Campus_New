const extracted = {
  "matched_bank": "BOC",
  "matched_slip_type": "Online Transfer",
  "transaction_id": "SYMF202607051440310956103",
  "atm_id": null,
  "remark": "IMA ARTS",
  "terminal_id": null,
  "narration": null,
  "phone_number": null,
  "amount": 65000,
  "date": "2026-07-05",
  "extra_data": [
    "Bamunusingha Archchige Sepalika Rathnawali Dias",
    "0532",
    "IMA Arts PVT LTD",
    "93668076",
    "DFCC BANK"
  ]
};

const row = {
  _rowIndex: 116,
  txnDate: "06-Jul-2026",
  // mock other things
};

const allRowVals = "116 1P8XOFeY9rN6H5WYRQWTTjxa3m1bDB5YzYjkYH4sw_P4 BOC false 06-Jul-2026 1440770000000 IMA ARTS 65,000.00           06-Jul-2026 65,000.00 IMA ARTS";
const normRowRef = allRowVals.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

console.log("normRowRef:", normRowRef);

let extractedDate = extracted.date ? String(extracted.date).trim() : '';
let rowDate = row.txnDate ? String(row.txnDate).trim() : '';
let isDateMatch = false;
if (extractedDate && rowDate) {
    let eDate = new Date(extractedDate);
    let rDate = new Date(rowDate);
    if (!isNaN(eDate.getTime()) && !isNaN(rDate.getTime())) {
        let diffTime = Math.abs(eDate - rDate);
        let diffDays = diffTime / (1000 * 60 * 60 * 24);
        if (diffDays <= 2) {
            isDateMatch = true;
        }
    }
}

console.log("isDateMatch:", isDateMatch);

if (isDateMatch) {
    let matchedViaRemark = false;
    if (extracted.remark) {
        let extractedRemark = String(extracted.remark).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        console.log("extractedRemark:", extractedRemark);
        if (extractedRemark.length >= 4 && normRowRef.includes(extractedRemark)) {
            console.log("MATCHED VIA REMARK");
            matchedViaRemark = true;
        }
    }
    
    if (!matchedViaRemark && extracted.extra_data && Array.isArray(extracted.extra_data)) {
        for (const ed of extracted.extra_data) {
            let normEd = String(ed).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            console.log("Checking normEd:", normEd);
            if (normEd.length >= 4 && normRowRef.includes(normEd)) {
                console.log("MATCHED VIA EXTRA DATA:", normEd);
                break;
            }
        }
    }
}
