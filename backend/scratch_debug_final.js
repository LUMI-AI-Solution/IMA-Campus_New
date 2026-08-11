const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const controller = require('./controllers/afterSeminarRetentionController');

async function test() {
    const req = {
        query: {
            batchId: '5', // Assuming 5 is the batch ID based on previous logs for July Intake (Wait, it was 5 for May Intake)
            targetMonthName: 'Monthly Payment - JULY'
        }
    };
    const res = {
        status: (code) => ({
            json: (data) => {
                const leads = data.leads;
                console.log("Total leads:", leads.length);
                const lead = leads.find(l => l.phone && l.phone.includes('742746667'));
                if (lead) {
                    console.log("Found lead 742746667");
                    console.log("Enrollment:", lead.enrollmentStatus);
                } else {
                    console.log("Lead not found. Some IDs:", leads.slice(0,3).map(l => l.studentId));
                }
            }
        })
    };
    
    // Actually, I can't just require the controller easily if it uses req/res deeply without full express. But it's simple enough.
    // Let's just run it!
    await controller.getRetentionCampaignData(req, res);
}
test().catch(console.error).finally(() => prisma.$disconnect());
