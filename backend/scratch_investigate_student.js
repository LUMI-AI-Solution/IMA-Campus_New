const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStudent() {
  const phone = '710472811';
  
  const student = await prisma.student.findFirst({
    where: {
      OR: [
        { phone: { contains: phone } },
        { whatsapp: { contains: phone } }
      ]
    },
    include: {
      payments: true,
      logisticsRecord: true,
    }
  });

  if (!student) {
    console.log("Student not found");
    return;
  }

  console.log("Student ID:", student.id, student.firstName, student.lastName);
  
  console.log("\nPayments:");
  student.payments.forEach(p => {
    console.log(`- ID: ${p.id}, status: ${p.status}, remark: ${p.remark}, payment_type: ${p.payment_type}, created: ${p.created_at}, subject: ${p.subjects}`);
  });

  console.log("\nLogistics Records:");
  student.logisticsRecord.forEach(l => {
    console.log(`- ID: ${l.id}, status: ${l.status}, sentType: ${l.sentType}, remark: ${l.remark}, skipReason: ${l.skipReason}, batchId: ${l.batchId}, created: ${l.createdAt}`);
  });
}

checkStudent().catch(console.error).finally(() => prisma.$disconnect());
