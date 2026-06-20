const { getRetentionCampaignData } = require('./controllers/afterSeminarRetentionController.js');
const req = { query: { businessId: 1, batchId: 5, targetMonthName: 'MONTHLY PAYMENT - MAY' } };
const res = {
    status: (code) => ({
        json: (data) => {
            const lead = data.leads.find(l => l.phone.includes('94761697027') || l.phone.includes('94766561661') || l.phone.includes('94740427186'));
            if (lead) {
                console.log("Found lead:", lead.phone);
                console.log("Enrollment Status:", lead.enrollmentStatus);
                console.log("Payment History:", JSON.stringify(lead.paymentHistory, null, 2));
                console.log("Enrolled Subjects:", lead.enrolledSubjects);
            }
        }
    })
};
getRetentionCampaignData(req, res);
