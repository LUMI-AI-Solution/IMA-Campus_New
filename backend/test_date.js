const now = new Date();
const colomboTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Colombo"}));
const currentHour = colomboTime.getHours();
const currentMinute = colomboTime.getMinutes();
const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
console.log("Colombo Time: ", colomboTime);
console.log("Current Time Str: ", currentTimeStr);
