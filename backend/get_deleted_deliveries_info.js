const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const upgradePayments = await prisma.payment.findMany({
    where: { remark: { contains: '[UPGRADE]' } }
  });
  const paymentIds = upgradePayments.map(p => p.id);
  console.log('Payment IDs:', paymentIds.join(','));
}
main().catch(console.error).finally(() => prisma.$disconnect());
