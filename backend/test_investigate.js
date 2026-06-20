const { getRetentionCampaignData } = require('./controllers/afterSeminarRetentionController.js');
const req = { query: { businessId: 1, batchId: 5, targetMonthName: 'Monthly Payment - MAY' } };
const res = {
    status: (code) => ({
        json: (data) => {
            const l1 = data.leads.find(l => l.phone.includes('561661'));
            const l2 = data.leads.find(l => l.phone.includes('538028'));
            if (l1) {
                console.log("\n--- Lead 561661 ---");
                console.log("Enrollment Status:", l1.enrollmentStatus);
                console.log("Enrolled Subjects:", l1.enrolledSubjects);
                console.log("First Enrolled Month:", l1.firstEnrolledMonthName);
                console.log("Payment History:", JSON.stringify(l1.paymentHistory, null, 2));
            }
            if (l2) {
                console.log("\n--- Lead 538028 ---");
                console.log("Enrollment Status:", l2.enrollmentStatus);
                console.log("Enrolled Subjects:", l2.enrolledSubjects);
                console.log("First Enrolled Month:", l2.firstEnrolledMonthName);
                console.log("Payment History:", JSON.stringify(l2.paymentHistory, null, 2));
            }
        }
    })
};
getRetentionCampaignData(req, res);
