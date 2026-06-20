const fs = require('fs');

const content = fs.readFileSync('frontend/src/components/admin/AISlipVerification.jsx', 'utf-8');

const lines = content.split('\n');

const startIdx = lines.findIndex(l => l.includes('{/* VERIFICATION ANIMATION OVERLAY - PREMIUM MILITARY HUD */}'));
const endIdx = lines.findIndex((l, i) => i > startIdx && l.includes(', document.body)}'));

if (startIdx !== -1 && endIdx !== -1) {
    lines.splice(startIdx, endIdx - startIdx + 1);
    fs.writeFileSync('frontend/src/components/admin/AISlipVerification.jsx', lines.join('\n'));
    console.log("HUD removed successfully.");
} else {
    console.log("HUD not found.", startIdx, endIdx);
}
