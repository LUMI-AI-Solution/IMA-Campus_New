const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'controllers', 'afterSeminarRetentionController.js');
let code = fs.readFileSync(filePath, 'utf8');

// 1. Filter out leads whose earliestGroupIndex > activeGroupIndex
// and 2. Fix the 3 months history
const replacement = `
            if (earliestGroupIndex === distinctMonthlyGroups.length) {
                earliestGroupIndex = 0; 
            }

            // FILTER: If the student's first payment is AFTER the active campaign month, they shouldn't be evaluated in this month
            if (earliestGroupIndex > activeGroupIndex) {
                return; 
            }

            // Build payment history from first enrolled month to active month
            let paymentHistory = {};
            
            // Generate paymentHistory for the last 3 months (Active month + 2 previous months)
            let startHistoryIndex = Math.max(0, activeGroupIndex - 2);
            
            baseSubjects.forEach(subjectName => {
                paymentHistory[subjectName] = {};
                for (let i = startHistoryIndex; i <= activeGroupIndex; i++) {
                    const group = distinctMonthlyGroups[i];`;

const target = `
            if (earliestGroupIndex === distinctMonthlyGroups.length) {
                earliestGroupIndex = 0; 
            }

            // Build payment history from first enrolled month to active month
            let paymentHistory = {};
            baseSubjects.forEach(subjectName => {
                paymentHistory[subjectName] = {};
                for (let i = earliestGroupIndex; i <= activeGroupIndex; i++) {
                    const group = distinctMonthlyGroups[i];`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync(filePath, code);
    console.log("Successfully patched retention controller.");
} else {
    console.log("Target string not found. Please check exact match.");
}
