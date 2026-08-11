const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const financeController = require('./controllers/financeController');

async function run() {
    const req = {
        query: { businessId: 1, batchId: "5" },
        user: { role: 'SYSTEM_ADMIN' }
    };
    const res = {
        status: (code) => ({
            json: (data) => {
                const s = data.students.find(s => s.id === 223);
                console.log("Student 223:", s);
            }
        })
    };
    await financeController.getPaidCampaignDropMatrix(req, res);
    process.exit(0);
}
run().catch(console.error);
