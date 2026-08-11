const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const students = await prisma.student.findMany({
    where: { OR: [{ phone: { contains: '18274' } }, { studentNo: { contains: '18274' } }] }
  });
  console.log("Students:", students);
  if (students.length > 0) {
    const payments = await prisma.payment.findMany({
      where: { studentId: students[0].id }
    });
    console.log("Payments:", payments);
  }
}
main();
