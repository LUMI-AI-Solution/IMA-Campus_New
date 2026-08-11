const dateStr = "2026-08-05";
const formattedStartTime = "13:00"; // 1 PM SL time
const startDateTime = new Date(`${dateStr}T${formattedStartTime}:00+05:30`);
const now = new Date("2026-08-05T07:15:00Z"); // 12:45 PM SL time is 07:15 UTC
const diffMins = (startDateTime - now) / (1000 * 60);
console.log(`startDateTime: ${startDateTime.toISOString()}`);
console.log(`now: ${now.toISOString()}`);
console.log(`diffMins: ${diffMins}`);
