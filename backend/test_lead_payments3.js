const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const leads = await prisma.lead.findMany({
        where: {
            OR: [
                { phone: { contains: '94766561661' } },
                { phone: { contains: '9477538028' } }
            ]
        }
    });
    
    for (const lead of leads) {
        console.log(`\n--- Lead: ${lead.phone} (ID: ${lead.id}, UserID: ${lead.userId}) ---`);
        if (!lead.userId) continue;
        
        const payments = await prisma.payment.findMany({
            where: { studentId: lead.userId }
        });
        console.log("Payments:", payments.length);
        payments.forEach(p => console.log(`  - ID: ${p.id}, Group: ${p.groupId}, Type: ${p.payment_type}, Status: ${p.status}, Subjects: ${p.subjects}`));
    }
}
check().finally(() => prisma.$disconnect());
