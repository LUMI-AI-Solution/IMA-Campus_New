const xlsx = require('xlsx');

const rawDataIn = [
  {"Date": "4-May-26", "Serial Number": "628000000000", "Referance": "CRDLESDEP 0000761430037 AECM", "Amount (LKR)": 1700.00},
  {"Date": "4-May-26", "Serial Number": "908000000000", "Referance": "april", "Amount (LKR)": 8750.00}
];

const ws = xlsx.utils.json_to_sheet(rawDataIn);
const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, ws, "Sheet1");
const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

const workbook = xlsx.read(buffer, { type: 'buffer' });
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rawData = xlsx.utils.sheet_to_json(sheet);

let excelDateCol = "Date";
let excelAmountCol = "Amount";
let excelDrCrCol = "";
let customColumns = [
    {name: "Serial Number", isCurrency: false},
    {name: "Referance", isCurrency: false}
];

let transactions = [];
rawData.forEach((row, i) => {
    const keys = Object.keys(row);
    const dateKey = (excelDateCol && keys.includes(excelDateCol)) ? excelDateCol : keys.find(k => k.toLowerCase().includes('date') || k.toLowerCase().includes('txn date'));
    const amountKey = (excelAmountCol && keys.includes(excelAmountCol)) ? excelAmountCol : keys.find(k => k.toLowerCase().includes('amount') || k.toLowerCase().includes('cr'));

    if (dateKey && amountKey) {
        let amount = parseFloat(String(row[amountKey]).replace(/,/g, ''));
        if (amount > 0 && !isNaN(amount)) {
            let descriptionObj = {};
            if (customColumns && customColumns.length > 0) {
                customColumns.forEach(col => {
                    const matchedKey = keys.find(k => k.trim().toLowerCase() === col.name.trim().toLowerCase());
                    if (matchedKey) {
                        descriptionObj[col.name] = row[matchedKey] !== undefined ? String(row[matchedKey]).trim() : '';
                    }
                });
            }
            console.log(`Row ${i} descriptionObj:`, descriptionObj);
            transactions.push({ amount, description: JSON.stringify(descriptionObj) });
        }
    }
});
