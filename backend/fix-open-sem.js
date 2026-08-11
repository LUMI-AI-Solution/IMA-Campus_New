const fs = require('fs');
const file = '/root/IMA-Campus/backend/controllers/afterSeminarInquiryController.js';
let content = fs.readFileSync(file, 'utf8');

// Replace the round logic block (around lines 1011-1050)
const oldLogic = `        } else {
            const assignedTime = lead.assignedAt ? new Date(lead.assignedAt).getTime() : new Date(lead.createdAt).getTime();
            const nowTime = new Date().getTime();
            const totalDaysSinceAssign = Math.floor((nowTime - assignedTime) / (1000 * 60 * 60 * 24));

            if (currentRound === 1) {
                if (actualStatus === 'reject') {
                    finalCallStatus = 'reject';
                    nextPhase = 1;
                } else if (actualStatus === 'answered') {
                    promoteToRound2 = true;
                } else if (actualStatus === 'no_answer') {
                    finalCallStatus = 'no_answer';
                    nextPhase = 1;
                } else if (actualStatus !== 'pending') {
                    finalCallStatus = actualStatus;
                    nextPhase = 1;
                }
            } else if (currentRound === 2) {
                if (actualStatus === 'reject') {
                    finalCallStatus = 'reject';
                    nextPhase = 1;
                } else if (actualStatus === 'answered') {
                    finalCallStatus = actualStatus;
                    nextPhase = 1;
                    if (totalDaysSinceAssign >= 10) {
                        nextRound = 3; 
                    }
                } else if (actualStatus === 'no_answer') {
                    finalCallStatus = actualStatus;
                    nextPhase = 1;
                } else {
                    finalCallStatus = actualStatus;
                    nextPhase = 1;
                    if (actualStatus !== 'pending' && totalDaysSinceAssign > 14) {
                        nextRound = 3; 
                    }
                }
            }
        }`;

const newLogic = `        } else {
            // 🔥 NEW 14-DAY ABSOLUTE TIMELINE LOGIC 🔥
            if (currentRound === 1) {
                if (actualStatus === 'reject') {
                    finalCallStatus = 'reject';
                    nextPhase = 1;
                } else if (actualStatus === 'no_answer') {
                    finalCallStatus = 'no_answer';
                    nextPhase = 1;
                } else if (actualStatus !== 'pending') {
                    // Any other update (e.g. answered) -> Move to Round 2 (it will be frozen dynamically based on 7-day rule)
                    promoteToRound2 = true;
                }
            } else if (currentRound === 2) {
                if (actualStatus === 'reject') {
                    finalCallStatus = 'reject';
                    nextPhase = 1;
                } else if (actualStatus === 'no_answer') {
                    finalCallStatus = 'no_answer';
                    nextPhase = 1;
                } else if (actualStatus !== 'pending') {
                    // Any other update in Round 2 immediately pushes it to Non-Enrolled (Round 3)
                    finalCallStatus = actualStatus;
                    nextPhase = 1;
                    nextRound = 3; 
                }
            }
        }`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync(file, content);
console.log('Logic replaced in updateCallCampaign');
