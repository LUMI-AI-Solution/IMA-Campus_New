const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const upgradePayments = await prisma.payment.findMany({
    where: { remark: { contains: '[UPGRADE]' } }
  });
  const paymentIds = upgradePayments.map(p => p.id);
  console.log(`Found ${paymentIds.length} upgrade payments`);
  
  if (paymentIds.length > 0) {
    const res = await prisma.delivery.deleteMany({
      where: { paymentId: { in: paymentIds } }
    });
    console.log(`Deleted ${res.count} duplicate upgrade deliveries`);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
