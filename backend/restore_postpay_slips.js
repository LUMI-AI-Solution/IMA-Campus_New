const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Looking for Post Pay slips that were demoted to Pending by AI...");

    const payments = await prisma.payment.findMany({
        where: {
            status: 0,
            valid_until: { not: null },
            aiVerified: false,
            OR: [
                { remark: { contains: 'AI Skipped' } },
                { remark: { contains: 'Batch Mismatch' } },
                { remark: { contains: 'Duplicate Slip' } }
            ]
        }
    });

    console.log(`Found ${payments.length} payments that match the criteria.`);

    let count = 0;
    for (const p of payments) {
        await prisma.payment.update({
            where: { id: p.id },
            data: { status: 4 }
        });
        count++;
        console.log(`Restored Payment ID #${p.id} back to Post Pay (status 4)`);
    }

    console.log(`Successfully restored ${count} slips back to Post Pay.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
