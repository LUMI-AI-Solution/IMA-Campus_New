const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const leads = await prisma.lead.findMany({
        where: { phone: { in: ['94766561661', '9477538028'] } }
    });
    
    for (const lead of leads) {
        console.log(`\n--- Lead: ${lead.phone} (ID: ${lead.id}) ---`);
        const payments = await prisma.payment.findMany({
            where: { leadId: lead.id }
        });
        console.log("Payments:", JSON.stringify(payments, null, 2));
    }
}
check().finally(() => prisma.$disconnect());
