let extractedDate = "2026-07-05";
let rowDate = "06-Jul-2026";
let eDate = new Date(extractedDate);
let rDate = new Date(rowDate);
console.log(eDate);
console.log(rDate);
let diffTime = Math.abs(eDate - rDate);
let diffDays = diffTime / (1000 * 60 * 60 * 24);
console.log(diffDays <= 2);
