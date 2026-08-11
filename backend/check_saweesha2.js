const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { phone: '0716009537' }
  });
  console.log("User:", user);
  
  if (user) {
    const payment = await prisma.payment.findUnique({
      where: { id: 4343 },
      include: {
        student: true,
        batch: true,
        group: true,
      }
    });
    console.log("Payment 4343:", JSON.stringify(payment, null, 2));

    const delivery = await prisma.delivery.findFirst({
      where: { paymentId: 4343 }
    });
    console.log("Delivery for payment 4343:", JSON.stringify(delivery, null, 2));

    const tuteDeliveries = await prisma.tuteDelivery.findMany({
      where: { 
        userId: user.id,
      },
      include: {
        tute: true,
      }
    });
    console.log("TuteDeliveries for user:", JSON.stringify(tuteDeliveries, null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
