let extractedDate = "2026-07-08";
let rowDate = "08-Jul-2026";
let eDate = new Date(extractedDate);
let rDate = new Date(rowDate);
console.log(eDate);
console.log(rDate);
let diffTime = Math.abs(eDate - rDate);
let diffDays = diffTime / (1000 * 60 * 60 * 24);
console.log(diffDays <= 2);
