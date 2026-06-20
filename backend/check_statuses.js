const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const deliveries = await prisma.delivery.findMany({
    where: { studentId: { in: ['164', '340', '369', '994'] } },
    include: { payment: true }
  });
  deliveries.forEach(d => {
    console.log(`Student: ${d.studentId}, Delivery: ${d.id}, Status: ${d.status}, Type: ${d.paymentType}, PaymentID: ${d.paymentId}`);
  });
}
main().catch(console.error).finally(() => prisma.$disconnect());
