const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const students = await prisma.user.findMany({
    where: {
      OR: [
        { firstName: { contains: 'Janidi' } },
        { firstName: { contains: 'Kanishka' } },
        { firstName: { contains: 'Chamalka' } },
        { lastName: { contains: 'Shivanthi' } },
        { lastName: { contains: 'Maleen' } },
        { id: 994 }
      ]
    }
  });

  const studentIds = students.map(s => s.id);
  console.log("Students: ", students.length);
  
  const payments = await prisma.payment.findMany({
    where: { studentId: { in: studentIds } },
    select: { id: true, studentId: true, payment_type: true, installment_no: true }
  });
  console.log('Payments:', payments);

  const deliveries = await prisma.delivery.findMany({
    where: { paymentId: { in: payments.map(p => p.id) } },
    select: { id: true, paymentId: true, paymentType: true, studentId: true }
  });
  console.log('Deliveries:', deliveries);
}
main().catch(console.error).finally(() => prisma.$disconnect());
