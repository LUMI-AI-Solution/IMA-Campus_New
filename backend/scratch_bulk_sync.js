const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { syncLeadEnrollment } = require('./controllers/paymentController');

async function main() {
    console.log('Fetching all approved payments...');
    const payments = await prisma.payment.findMany({
        where: { status: 1 },
        select: { studentId: true, payment_type: true }
    });
    
    // Get unique studentIds
    const uniqueStudents = [...new Map(payments.map(item =>
      [item.studentId, item])).values()];
      
    console.log(`Found ${uniqueStudents.length} unique students with approved payments. Syncing...`);
    
    let synced = 0;
    for (const p of uniqueStudents) {
        await syncLeadEnrollment(p.studentId, p.payment_type, { status: 1 });
        synced++;
        if (synced % 100 === 0) console.log(`Synced ${synced}...`);
    }
    console.log('Bulk sync complete.');
}
main().catch(console.error).finally(() => prisma.$disconnect());
