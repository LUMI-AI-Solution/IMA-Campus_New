const fs = require('fs');
const filePath = '/root/IMA-Campus/frontend/src/components/admin/AISlipVerification.jsx';

let content = fs.readFileSync(filePath, 'utf8');

const startTag = '{/* RESULTS SECTION */}';
const endTag = '{/* VERIFICATION ANIMATION OVERLAY - DIGITAL ARMY PLANNING BOARD */}';

const startIndex = content.indexOf(startTag);
const endIndex = content.indexOf(endTag);

if (startIndex !== -1 && endIndex !== -1) {
    content = content.slice(0, startIndex) + content.slice(endIndex);
    fs.writeFileSync(filePath, content);
    console.log("Successfully removed RESULTS SECTION");
} else {
    console.error("Could not find start or end tags.");
}
