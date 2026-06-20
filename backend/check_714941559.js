const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const user = await prisma.user.findFirst({
        where: { phone: { contains: '714941559' } },
        include: {
            payments: {
                orderBy: { created_at: 'desc' }
            }
        }
    });
    
    if (!user) {
        console.log("User not found");
        return;
    }
    
    console.log("User:", user.id, user.firstName, user.lastName);
    console.log("Payments:");
    for (let p of user.payments) {
        console.log(`- ID: ${p.id}, Status: ${p.status}, Type: ${p.payment_type}, Remark: ${p.remark}, Subjects: ${p.subjects}`);
        const delivery = await prisma.delivery.findUnique({ where: { paymentId: p.id } });
        if (delivery) {
            console.log(`  -> Delivery: ID: ${delivery.id}, Status: ${delivery.status}`);
        } else {
            console.log(`  -> Delivery: None`);
        }
    }
}
check().finally(() => prisma.$disconnect());
