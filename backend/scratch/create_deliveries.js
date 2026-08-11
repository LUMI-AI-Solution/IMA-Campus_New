const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Fetching AI verified payments that are NOT in deliveries...");
        
        const payments = await prisma.payment.findMany({
            where: {
                aiVerified: true,
                status: 1,
                delivery: null
            },
            include: {
                student: true
            }
        });

        console.log(`Found ${payments.length} AI verified payments without delivery.`);

        let successCount = 0;
        for (const payment of payments) {
            try {
                await prisma.delivery.create({
                    data: {
                        paymentId: payment.id,
                        studentId: String(payment.studentId),
                        businessId: payment.businessId || 1,
                        paymentType: payment.paymentType || "slip",
                        status: "Pending" // String status
                    }
                });
                successCount++;
                console.log(`Created delivery for Payment ID: ${payment.id} (Student: ${payment.student?.name})`);
            } catch (err) {
                console.error(`Failed to create delivery for Payment ID: ${payment.id}:`, err.message);
            }
        }
        
        console.log(`\nSuccessfully created ${successCount} deliveries.`);
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
