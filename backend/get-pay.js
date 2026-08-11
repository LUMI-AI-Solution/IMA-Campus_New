const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const payments = await prisma.payment.findMany({
    where: {
        student: {
            OR: [
                { phone: { contains: '331972' } },
                { studentNo: { contains: '331972' } }
            ]
        }
    },
    include: { student: true, batch: true, group: true }
  });
  console.log("Payments found:", payments.length);
  payments.forEach(p => {
    console.log(`ID: ${p.id}, Status: ${p.status}, Type: ${p.type}, Amount: ${p.amount}, Remark: ${p.remark}`);
    console.log(`Student: ${p.student?.studentNo}, Phone: ${p.student?.phone}`);
  });
}
main().catch(console.error).finally(() => prisma.$disconnect());
