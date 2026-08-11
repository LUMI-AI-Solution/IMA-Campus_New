const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const s = await prisma.user.findFirst({ where: { phone: { contains: '0770730971' } } });
  if (!s) { console.log('not found'); return; }
  const p = await prisma.payment.findMany({ where: { studentId: s.id } });
  console.log('Student:', s.id, s.firstName, s.businessType);
  console.log('Payments:', p.map(x => ({ id: x.id, businessId: x.businessId, status: x.status, type: x.payment_type })));
}
run().finally(() => prisma.$disconnect());
