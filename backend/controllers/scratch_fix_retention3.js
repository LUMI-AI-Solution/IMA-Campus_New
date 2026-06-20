const fs = require('fs');
let code = fs.readFileSync('/root/IMA-Campus/backend/controllers/afterSeminarRetentionController.js', 'utf8');

// We need to rewrite the activeLeads processing logic.
// The user wants leads to ONLY appear in Paid Campaign if they have a payment or slip (status 0, 1, 2, 4)
// AND if they have a pending slip, they should show as PAYMENT_PROCESSING in NON_ENROLLED.
// And if they have an approved slip (status 1, 4), they should show as ENROLLED in FULL or MONTHLY based on payment type.
// If they have NO payment/slip, they should NOT be in the response at all for the Paid Campaign! Wait.
// "lamayage slip eka reject unot ethakotath campaign eka karalanm tynne aya eka fresh wenna ona na" -> "If slip is rejected, and campaign is done, they shouldn't be fresh."
// Meaning rejected slips should also be in NON_ENROLLED!

const newLogic = `
        const leadsWithGroupData = [];
        
        activeLeads.forEach(l => {
            const cleanPhone = l.phone.split('_')[0];
            const leadLast9 = getLast9Digits(cleanPhone);
            const studentPayments = payments.filter(p => {
                if (!p.student || (!p.student.phone && !p.student.whatsapp)) return false;
                const studentLast9 = getLast9Digits(p.student.phone || p.student.whatsapp);
                return leadLast9 !== '' && leadLast9 === studentLast9;
            });

            // "methana depend wenne payment mange eken" -> Only process if they have payments!
            if (studentPayments.length === 0) return; // Skip completely! This solves the issue of leads appearing without payments.

            let enrolledGroupIds = [];
            let enrolledSubjects = new Set();
            
            // Check statuses
            const hasApprovedFull = studentPayments.some(p => p.payment_type === 3 && [1, 4].includes(p.status));
            const hasApprovedInstallment = studentPayments.some(p => p.payment_type === 2 && [1, 4].includes(p.status));
            const hasApprovedMonthly = studentPayments.some(p => p.payment_type === 1 && [1, 4].includes(p.status));
            const hasPendingOrRejected = studentPayments.some(p => [0, 2].includes(p.status));

            // Force enrollmentStatus and paymentIntention purely from payment manage
            if (hasApprovedFull) {
                l.paymentIntention = 'FULL';
                l.enrollmentStatus = 'ENROLLED';
                enrolledGroupIds = monthlyGroupsRaw.map(g => g.id);
            } else if (hasApprovedInstallment) {
                l.paymentIntention = 'INSTALLMENT';
                l.enrollmentStatus = 'ENROLLED';
                studentPayments.forEach(p => { if (p.groupId && [1, 4].includes(p.status)) enrolledGroupIds.push(p.groupId); });
            } else if (hasApprovedMonthly) {
                l.paymentIntention = 'MONTHLY';
                l.enrollmentStatus = 'ENROLLED';
                studentPayments.forEach(p => { if (p.groupId && [1, 4].includes(p.status)) enrolledGroupIds.push(p.groupId); });
            } else if (hasPendingOrRejected) {
                // Keep them in NON_ENROLLED tab
                l.paymentIntention = 'NOT_DECIDED'; 
                // Set their visual status
                if (studentPayments.some(p => p.status === 0)) {
                    l.enrollmentStatus = 'PAYMENT_PROCESSING';
                } else if (studentPayments.some(p => p.status === 2)) {
                    l.enrollmentStatus = 'PAYMENT_REJECTED';
                } else {
                    l.enrollmentStatus = 'NOT_ENROLLED';
                }
            }

            studentPayments.forEach(p => {
                if ([1, 4].includes(p.status) && p.subjects) {
                    try {
                        const parsed = JSON.parse(p.subjects);
                        parsed.forEach(sub => {
                            const subId = parseInt(sub.id || sub);
                            if (courseMap[subId]) enrolledSubjects.add(courseMap[subId]);
                        });
                    } catch (e) {}
                }
            });

            const isUpgraded = studentPayments.some(p => p.remark && p.remark.includes('[UPGRADE]'));
            leadsWithGroupData.push({ ...l, enrolledGroupIds: [...new Set(enrolledGroupIds)], enrolledSubjects: Array.from(enrolledSubjects), isUpgraded });
        });
`;

let startIdx = code.indexOf('const leadsWithGroupData = activeLeads.map(l => {');
let endIdx = code.indexOf('// 5. Calculate Retention Stats');

if(startIdx !== -1 && endIdx !== -1) {
    code = code.substring(0, startIdx) + newLogic + '\n        ' + code.substring(endIdx);
    fs.writeFileSync('/root/IMA-Campus/backend/controllers/afterSeminarRetentionController.js', code);
    console.log("Updated activeLeads processing logic.");
} else {
    console.log("Could not find start/end indices for replacement.");
}
