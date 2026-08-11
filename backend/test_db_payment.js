const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const payment = await prisma.payment.findMany({
    where: { student: { phone: { startsWith: '000000008' } } },
    include: { group: true }
  });
  console.log(payment);
}
main().finally(() => prisma.$disconnect());
