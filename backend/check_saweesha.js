const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { phone: '0716009537' }
  });
  console.log("User:", user);
  
  if (user) {
    const payments = await prisma.payment.findMany({
      where: { userId: user.id },
      include: {
        tuteDeliveries: true,
      }
    });
    console.log("Payments for user:", JSON.stringify(payments, null, 2));

    const payment4343 = await prisma.payment.findUnique({
      where: { id: 4343 },
      include: {
        tuteDeliveries: true,
      }
    });
    console.log("Payment 4343 directly:", JSON.stringify(payment4343, null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
