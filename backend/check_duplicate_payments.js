const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
    const allPayments = await prisma.payment.findMany();
    console.log(`Total payments: ${allPayments.length}`);
    let dupes = 0;
    const pMap = {};
    allPayments.forEach(p => {
        // A duplicate payment might have the same studentId, amount, batchId, and date
        const key = `${p.studentId}_${p.amount}_${p.batchId}_${p.businessId}`;
        if (!pMap[key]) pMap[key] = [];
        pMap[key].push(p);
    });
    for (const key in pMap) {
        if (pMap[key].length > 1) {
            dupes++;
        }
    }
    console.log(`Potential duplicated payment groups: ${dupes}`);
    if (dupes > 0) {
        console.log(pMap[Object.keys(pMap).find(k => pMap[k].length > 1)]);
    }
    await prisma.$disconnect();
}
run();
