const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const students = await prisma.student.findMany({
    where: { OR: [{ phone: { contains: '331972' } }, { studentNo: { contains: '331972' } }, { phone: { contains: '18274' } }] }
  });
  console.log("Students:", students.map(s => ({id: s.id, no: s.studentNo, phone: s.phone})));
  
  for (const s of students) {
    const payments = await prisma.payment.findMany({
      where: { studentId: s.id },
      include: { batch: true, group: true }
    });
    console.log(`Payments for Student ${s.id}:`, payments.map(p => ({
      id: p.id, status: p.status, amount: p.amount, type: p.type, remark: p.remark, 
      groupName: p.group?.name, batchName: p.batch?.name
    })));
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
