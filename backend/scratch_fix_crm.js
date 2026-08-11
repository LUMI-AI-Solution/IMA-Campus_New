const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { syncLeadEnrollment } = require('./controllers/paymentController');

async function fixMissingCRM() {
    try {
        const payments = await prisma.payment.findMany({
            where: {
                id: { in: [2728, 2797, 2892, 2936, 2944, 2954, 2995] }
            }
        });

        for (const payment of payments) {
            console.log(`Syncing CRM for Payment ID: ${payment.id}`);
            try {
                await syncLeadEnrollment(parseInt(payment.studentId), payment.payment_type, payment);
                console.log(`CRM synced successfully for Payment ${payment.id}`);
            } catch(e) {
                console.log(`Error syncing CRM for Payment ${payment.id}:`, e);
            }
        }
    } catch(err) {
        console.error("Error:", err);
    }
}

fixMissingCRM().finally(() => process.exit(0));
