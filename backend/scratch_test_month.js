const ALL_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const name = "Monthly Payment - July";
const monthMatch = ALL_MONTHS.find(m => name.toLowerCase().includes(m.toLowerCase()));
const monthKey = monthMatch ? monthMatch.toUpperCase() : null;
console.log({ monthKey });
