const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const batch = await prisma.batch.findFirst();
  if (!batch) return console.log('No batch found');
  console.log('Testing for batch', batch.id);

  // just fetch raw payments
  const payments = await prisma.payment.findMany({
    where: { batchId: batch.id, status: 1 },
    take: 10
  });
  console.log('Sample payments:', payments.length);
  for (let p of payments) {
      if (!p.subjects) continue;
      let subs = JSON.parse(p.subjects);
      console.log('Payment ID', p.id, 'Amount', p.amount, 'Subs', subs);
  }
}
test().catch(console.error).finally(() => prisma.$disconnect());
