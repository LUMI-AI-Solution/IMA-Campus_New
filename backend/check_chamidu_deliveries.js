const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const phones = ['0776701644', '0703381618', '0775561644', '94776701644', '94703381618', '94775561644'];
    
    // Check Deliveries
    const deliveries = await prisma.delivery.findMany({
        where: {
            OR: [
                { studentPhone: { in: phones } },
                { additionalPhones: { contains: '0776701644' } },
                { additionalPhones: { contains: '0703381618' } },
                { additionalPhones: { contains: '0775561644' } }
            ]
        }
    });
    console.log("\n=== DELIVERIES ===");
    deliveries.forEach(d => console.log(`ID: ${d.id}, Name: ${d.studentName}, Phone: ${d.studentPhone}, AddPhones: ${d.additionalPhones}, Address: ${d.address}, P_ID: ${d.paymentId}, Status: ${d.status}`));
}

main().finally(() => prisma.$disconnect());
