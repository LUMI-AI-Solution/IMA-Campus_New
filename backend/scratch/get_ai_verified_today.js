const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const startOfDay = new Date("2026-07-08T18:30:00Z");

    const payments = await prisma.payment.findMany({
        where: {
            aiVerified: true,
            status: 1, // Verified
            created_at: {
                gte: startOfDay
            }
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
        p.batch?.name?.toLowerCase().includes("bio") ||
        p.batch?.name?.toLowerCase().includes("maths") ||
        p.batch?.name?.toLowerCase().includes("tech")
    );

    const result = artCommercePayments.map(p => ({
        paymentId: p.id,
        studentName: `${p.student?.firstName || ''} ${p.student?.lastName || ''}`.trim(),
        batchName: p.batch?.name,
        amount: p.amount,
        hasDelivery: p.delivery ? "Yes" : "No",
        createdAt: p.created_at.toISOString()
    }));

    console.log(JSON.stringify(result.filter(r => r.hasDelivery === "No").slice(0, 5), null, 2));
    
    // How many without delivery?
    const noDelivery = result.filter(r => r.hasDelivery === "No").length;
    console.log(`\nTotal Art/Commerce WITHOUT delivery today: ${noDelivery}`);
    
    const withDelivery = result.filter(r => r.hasDelivery === "Yes").length;
    console.log(`Total Art/Commerce WITH delivery today: ${withDelivery}`);
}
run().catch(console.error).finally(() => process.exit());
