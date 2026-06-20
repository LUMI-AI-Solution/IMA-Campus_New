const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const phones = ['0776701644', '0703381618', '0775561644', '94776701644', '94703381618', '94775561644'];
    
    // Check Leads
    const leads = await prisma.lead.findMany({
        where: {
            OR: phones.map(p => ({ phone: { contains: p } }))
        }
    });
    console.log("=== LEADS ===");
    leads.forEach(l => console.log(`ID: ${l.id}, Name: ${l.name}, Phone: ${l.phone}`));

    // Check Payments
    const payments = await prisma.payment.findMany({
        where: {
            OR: [
                { studentPhone: { in: phones } },
                { systemPhone: { in: phones } },
                { whatsappPhone: { in: phones } }
            ]
        }
    });
    console.log("\n=== PAYMENTS ===");
    payments.forEach(p => console.log(`ID: ${p.id}, Amount: ${p.amount}, Date: ${p.paymentDate}, Status: ${p.status}, StudentPhone: ${p.studentPhone}, WAPhone: ${p.whatsappPhone}`));

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
    deliveries.forEach(d => console.log(`ID: ${d.id}, Name: ${d.studentName}, Phone: ${d.studentPhone}, AddPhones: ${d.additionalPhones}, Address: ${d.address}`));
}

main().finally(() => prisma.$disconnect());
