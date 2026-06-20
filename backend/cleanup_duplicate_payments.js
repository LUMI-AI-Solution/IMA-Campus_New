const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
    console.log("Starting cleanup of duplicate pending payments...");
    const pendingPayments = await prisma.payment.findMany({
        where: { status: 0 }
    });

    const pMap = {};
    pendingPayments.forEach(p => {
        const key = `${p.studentId}_${p.batchId}_${p.groupId}_${p.amount}`;
        if (!pMap[key]) pMap[key] = [];
        pMap[key].push(p);
    });

    let deletedCount = 0;

    for (const key in pMap) {
        const group = pMap[key];
        if (group.length > 1) {
            // Sort by created_at DESC (newest first)
            group.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            
            // Keep the first one (newest), delete the rest
            const toDelete = group.slice(1);
            for (const p of toDelete) {
                await prisma.payment.delete({ where: { id: p.id } });
                deletedCount++;
            }
        }
    }

    console.log(`Successfully deleted ${deletedCount} duplicate pending payment records.`);
    await prisma.$disconnect();
}
cleanup().catch(e => { console.error(e); process.exit(1); });
