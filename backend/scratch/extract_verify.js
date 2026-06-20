const fs = require('fs');
const content = fs.readFileSync('/root/IMA-Campus/backend/controllers/aiVerificationController.js', 'utf8');

const startIndex = content.indexOf('exports.verifySinglePayment = async (req, res) => {');
const endIndex = content.indexOf('exports.executeCommand = async (req, res) => {');

let verifyCode = content.slice(startIndex, endIndex);
fs.writeFileSync('/root/IMA-Campus/backend/scratch/verify_old.js', verifyCode);
console.log('Extracted to verify_old.js');
