const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getAiVerified() {
    const payments = await prisma.payment.findMany({
        where: {
            aiVerified: true,
            status: 1,
            delivery: null
        },
        include: {
            student: true,
            business: true,
            batch: true
        }
    });

    console.log("=== AI VERIFIED PAYMENTS (NOT DISPATCHED) ===");
    console.log(`Total: ${payments.length}\n`);

    payments.forEach(p => {
        const sName = p.student ? `${p.student.firstName} ${p.student.lastName}` : 'N/A';
        const batchName = p.batch ? p.batch.name : 'N/A';
        const bizName = p.business ? p.business.name : 'N/A';
        console.log(`[Payment ID: ${p.id}]`);
        console.log(`Student: ${sName} | Batch: ${batchName} | Business: ${bizName}`);
        console.log(`Amount: ${p.amount} | Method: ${p.method}`);
        console.log(`Remark: ${p.remark}`);
        console.log('----------------------------------------------------');
    });
}

getAiVerified()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
