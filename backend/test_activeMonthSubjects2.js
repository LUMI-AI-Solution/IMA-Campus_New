const { getRetentionCampaignData } = require('./controllers/afterSeminarRetentionController.js');
const req = { query: { businessId: 1, batchId: 5, targetMonthName: 'Monthly Payment - MAY' } };
const res = {
    status: (code) => ({
        json: (data) => {
            const lead = data.leads.find(l => l.phone.includes('94761697027'));
            if (lead) {
                console.log("Found lead:", lead.phone);
                console.log("Enrollment Status:", lead.enrollmentStatus);
            }
        }
    })
};
getRetentionCampaignData(req, res);
