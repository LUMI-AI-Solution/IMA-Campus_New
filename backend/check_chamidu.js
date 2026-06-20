const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const phones = ['0776701644', '0703381618', '0775561644', '94776701644', '94703381618', '94775561644'];
    
    // Check Payments and their Deliveries
    const payments = await prisma.payment.findMany({
        where: {
            OR: [
                { studentPhone: { in: phones } },
                { systemPhone: { in: phones } },
                { whatsappPhone: { in: phones } }
            ]
        },
        include: {
            delivery: true
        }
    });
    
    console.log("\n=== PAYMENTS & DELIVERIES ===");
    payments.forEach(p => {
        console.log(`Payment ID: ${p.id}, Amount: ${p.amount}, Date: ${p.paymentDate}, Status: ${p.status}`);
        console.log(`   Phones: Student=${p.studentPhone}, System=${p.systemPhone}, WA=${p.whatsappPhone}`);
        console.log(`   Address: ${p.shippingAddress}`);
        if (p.delivery) {
            console.log(`   Delivery ID: ${p.delivery.id}, Status: ${p.delivery.status}, HoldReason: ${p.delivery.holdReason}`);
        } else {
            console.log(`   No Delivery associated.`);
        }
        console.log('---');
    });
}

main().finally(() => prisma.$disconnect());
