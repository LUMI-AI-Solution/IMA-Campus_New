const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const payment = await prisma.payment.findUnique({
    where: { id: 2641 },
    include: {
      student: true
    }
  });
  console.log(JSON.stringify(payment, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
