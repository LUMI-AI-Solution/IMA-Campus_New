const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const payments = await prisma.payment.findMany({
        where: {
            aiVerified: true,
            status: 1, // Verified
            delivery: null
        },
        include: {
            student: { select: { firstName: true, lastName: true, phone: true } },
            batch: { select: { name: true } },
            delivery: true
        }
    });

    const artCommercePayments = payments.filter(p => 
        p.batch?.name?.toLowerCase().includes("art") || 
        p.batch?.name?.toLowerCase().includes("commerce") ||
        p.batch?.name?.toLowerCase().includes("26") || 
        p.batch?.name?.toLowerCase().includes("27") ||
        p.batch?.name?.includes("කලා") ||
        p.batch?.name?.includes("වාණිජ")
    );

    const result = artCommercePayments.map(p => ({
        paymentId: p.id,
        studentName: `${p.student?.firstName || ''} ${p.student?.lastName || ''}`.trim(),
        batchName: p.batch?.name,
        amount: p.amount,
        createdAt: p.created_at.toISOString()
    }));

    console.log(JSON.stringify(result, null, 2));
    console.log(`\nTotal Art/Commerce WITHOUT delivery: ${result.length}`);
}
run().catch(console.error).finally(() => process.exit());
