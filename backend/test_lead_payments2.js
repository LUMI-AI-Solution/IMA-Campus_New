const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const leads = await prisma.lead.findMany({
        where: {
            OR: [
                { phone: { contains: '94766561661' } },
                { phone: { contains: '9477538028' } },
                { phone: { contains: '561661' } },
                { phone: { contains: '538028' } }
            ]
        }
    });
    
    for (const lead of leads) {
        console.log(`\n--- Lead: ${lead.phone} (ID: ${lead.id}) ---`);
        const payments = await prisma.payment.findMany({
            where: { leadId: lead.id }
        });
        console.log("Payments:", payments.length);
        payments.forEach(p => console.log(`  - ID: ${p.id}, Group: ${p.groupId}, Type: ${p.payment_type}, Status: ${p.status}, Subjects: ${p.subjects}`));
    }
}
check().finally(() => prisma.$disconnect());
