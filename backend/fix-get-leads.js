const fs = require('fs');
const file = '/root/IMA-Campus/backend/controllers/afterSeminarInquiryController.js';
let content = fs.readFileSync(file, 'utf8');

const oldMapping = `            if (isOpenSem || l.inquiryType === 'OPEN_SEMINAR') {
                return {
                    ...l,
                    phase: l.openSemPhase || 1,
                    callStatus: l.openSemCallStatus || 'pending',
                    coordinationRound: l.openSemRound || 1,
                    feedback: l.openSemFeedback || '',
                    callMethod: l.openSemCallMethod || null,
                    callAttempt: l.openSemCallAttempt || 1
                };
            }`;

const newMapping = `            if (isOpenSem || l.inquiryType === 'OPEN_SEMINAR') {
                const assignedTime = l.assignedAt ? new Date(l.assignedAt).getTime() : new Date(l.createdAt).getTime();
                const nowTime = new Date().getTime();
                const totalDaysSinceAssign = Math.floor((nowTime - assignedTime) / (1000 * 60 * 60 * 24));
                
                let round = l.openSemRound || 1;
                let locked = false;
                let unlocksInDays = 0;
                let finalCallStatus = l.openSemCallStatus || 'pending';
                let finalPhase = l.openSemPhase || 1;
                
                // Auto move to Non-Enrolled if 14 days passed and not PAID
                if (totalDaysSinceAssign >= 14 && l.enrollmentStatus !== 'ENROLLED') {
                    round = 3; 
                } 
                // Round 2 Freeze Logic
                else if (round === 2) {
                    if (totalDaysSinceAssign < 7) {
                        locked = true;
                        unlocksInDays = 7 - totalDaysSinceAssign;
                    } else {
                        // After 7 days, it unlocks as a fresh lead!
                        // If it hasn't been updated yet (is still pending from the auto-move)
                        // It's naturally pending. If it was updated, it's not.
                    }
                }

                // Extract Round 1 feedback from history if available
                let r1Feedback = '';
                if (l.roundProgress && Array.isArray(l.roundProgress)) {
                    const r1 = l.roundProgress.find(r => r.roundNum === 1 && r.campaignCategory === 'OPEN_SEMINAR');
                    if (r1) r1Feedback = r1.feedback || '';
                }

                return {
                    ...l,
                    phase: finalPhase,
                    callStatus: finalCallStatus,
                    coordinationRound: round,
                    feedback: l.openSemFeedback || '',
                    r1Feedback: r1Feedback,
                    locked: locked,
                    unlocksInDays: unlocksInDays,
                    callMethod: l.openSemCallMethod || null,
                    callAttempt: l.openSemCallAttempt || 1
                };
            }`;

content = content.replace(oldMapping, newMapping);
fs.writeFileSync(file, content);
console.log('Mapping replaced in getCampaignLeads');
