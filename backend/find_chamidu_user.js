const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const phones = ['0776701644', '0703381618', '0775561644', '94776701644', '94703381618', '94775561644'];
    
    const users = await prisma.user.findMany({
        where: {
            OR: phones.map(p => ({ phone: { contains: p } }))
        },
        include: {
            payments: {
                include: {
                    delivery: true
                }
            }
        }
    });
    
    console.log("\n=== USERS ===");
    users.forEach(u => {
        console.log(`User ID: ${u.id}, Name: ${u.name}, Phone: ${u.phone}, AltPhone: ${u.altPhone}`);
        console.log(`Address: ${u.address}`);
        u.payments.forEach(p => {
            console.log(`   Payment ID: ${p.id}, Date: ${p.paymentDate || p.created_at}`);
            if (p.delivery) {
                console.log(`      Delivery ID: ${p.delivery.id}, Status: ${p.delivery.status}, Hold: ${p.delivery.holdRemark}`);
            }
        });
    });
}

main().finally(() => prisma.$disconnect());
