const row = {
  _rowIndex: 116,
  _sheetName: "Sheet1",
  colA: "116",
  colB: "1P8XOFeY9rN6H5WYRQWTTjxa3m1bDB5YzYjkYH4sw_P4",
  colC: "BOC",
  colD: "false",
  colE: "06-Jul-2026",
  colF: "1440770000000",
  colG: "IMA ARTS",
  colH: "65,000.00",
  colI: "          ",
  colJ: "06-Jul-2026",
  colK: "65,000.00",
  colL: "IMA ARTS"
};
const targetAmount = 65000;
let hasMatchingAmount = false;
for (const [key, val] of Object.entries(row)) {
    if (key.startsWith('_')) continue;
    let strVal = String(val).replace(/,/g, '');
    let match = strVal.match(/\d+(\.\d+)?/);
    let cAmt = match ? parseFloat(match[0]) : NaN;
    if (!isNaN(cAmt) && Math.abs(cAmt - targetAmount) <= 0.1) {
        console.log("Matched amount on key:", key, "val:", val, "cAmt:", cAmt);
        hasMatchingAmount = true;
        break;
    }
}
console.log("hasMatchingAmount:", hasMatchingAmount);
