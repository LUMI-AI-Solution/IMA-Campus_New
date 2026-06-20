const fs = require('fs');
const oldUiContent = fs.readFileSync('backend/old_ui.jsx', 'utf8');
let slipContent = fs.readFileSync('frontend/src/components/admin/AISlipVerification.jsx', 'utf8');

const startIdx = slipContent.indexOf('{isVerifying && currentVerifyingSlip && (');
const endMarker = '{/* NEW MONTH MODAL */}';
const endIdx = slipContent.indexOf(endMarker, startIdx);

if (startIdx !== -1 && endIdx !== -1) {
    const newContent = slipContent.substring(0, startIdx) + oldUiContent + '\n      ' + slipContent.substring(endIdx);
    fs.writeFileSync('frontend/src/components/admin/AISlipVerification.jsx', newContent);
    console.log("Successfully replaced HUD animation!");
} else {
    console.log("Failed to find markers.");
}
