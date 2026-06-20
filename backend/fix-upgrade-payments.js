const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
    const payments = await prisma.payment.findMany({
        where: {
            remark: { contains: '[UPGRADE]' }
        }
    });
    
    let fixed = 0;
    for (const p of payments) {
        if (p.remark.includes('Installment Card') && p.payment_type !== 2) {
            console.log(`Fixing Payment ID ${p.id} to Installment (2)`);
            await prisma.payment.update({
                where: { id: p.id },
                data: { payment_type: 2 }
            });
            fixed++;
        } else if (p.remark.includes('FULL Card') && p.payment_type !== 3) {
            console.log(`Fixing Payment ID ${p.id} to Full (3)`);
            await prisma.payment.update({
                where: { id: p.id },
                data: { payment_type: 3 }
            });
            fixed++;
        }
    }
    console.log(`Fixed ${fixed} payments.`);
}
fix().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
