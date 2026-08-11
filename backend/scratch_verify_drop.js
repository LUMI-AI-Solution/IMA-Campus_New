const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
    console.log("--- 1000% Data Verification Script (Read-Only) ---");
    // Get all full payments for a specific batch. Let's use batchId 5 as test.
    const batchId = 5;
    
    const allPayments = await prisma.payment.findMany({
        where: { 
            batchId: batchId,
            status: 'Approved' // Drop analytics only considers approved payments
        },
        include: {
            paymentSubjects: { include: { subject: true } }
        }
    });

    console.log(`Total Approved Payments in Batch 5: ${allPayments.length}`);

    let fullPayments = 0;
    allPayments.forEach(p => {
        if (p.payment_type === 3 || p.type === 'Full') fullPayments++;
    });
    console.log(`Total Full Payments: ${fullPayments}`);

    // Let's do the month-by-month drop logic simulation here
    // ...

    console.log("No database records were altered.");
}

verify().catch(e => console.error(e)).finally(() => prisma.$disconnect());
