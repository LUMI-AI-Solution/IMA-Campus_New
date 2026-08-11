const messageText = "htt";
const textLower = messageText.toLowerCase();
const blockedWords = ["paraya", "huththa", "paka", "wesige", "kari", "ponnaya", "hukanna", "pakaya", "balla", "vesi", "htt", "htto", "pko", "pco", "pnny", "pnnyo", "pk"];
const blockedLinks = ["http", "www", "zoom", "meet", "youtube", "bit.ly", ".com", ".lk"];

const hasBadWord = blockedWords.some(word => textLower.includes(word));
const hasLink = blockedLinks.some(link => textLower.includes(link));

console.log("hasBadWord:", hasBadWord);
console.log("hasLink:", hasLink);
console.log("isViolation:", hasBadWord || hasLink);
