const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const financeController = require('./controllers/financeController');

async function run() {
    const batches = await prisma.batch.findMany({
        include: { _count: { select: { payments: true } } },
        orderBy: { payments: { _count: 'desc' } },
        take: 1
    });
    if (batches.length === 0) return console.log("No batches");
    const batch = batches[0];
    console.log("Testing with Batch:", batch.id, "which has", batch._count.payments, "payments");

    const req = {
        query: { businessId: batch.businessId, batchId: batch.id.toString() },
        user: { role: 'SYSTEM_ADMIN' }
    };
    const res = {
        status: (code) => ({
            json: (data) => console.log(`Response [${code}]:`, data.students?.length, "students", data.months?.length, "months")
        })
    };
    await financeController.getPaidCampaignDropMatrix(req, res);
    process.exit(0);
}
run().catch(console.error);
