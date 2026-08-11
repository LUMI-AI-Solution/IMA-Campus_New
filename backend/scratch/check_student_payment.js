const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const identifier = "62443605";
  console.log(`Checking for student with ID/Phone: ${identifier}`);

  // Try to find student by ID
  let student = await prisma.student.findUnique({
    where: { id: parseInt(identifier) || -1 },
    include: {
      payments: true,
      tutes: true
    }
  });

  if (!student) {
    console.log(`Student ID ${identifier} not found. Checking by phone...`);
    student = await prisma.student.findFirst({
      where: { phone: { contains: identifier } },
      include: {
        payments: true,
        tutes: true
      }
    });
  }

  if (!student) {
    console.log(`Student not found with identifier ${identifier}`);
    return;
  }

  console.log(`Found Student: ID=${student.id}, Name=${student.name}, Phone=${student.phone}, Status=${student.status}`);
  
  console.log("\n--- Payments ---");
  student.payments.forEach(p => {
    console.log(`Payment ID: ${p.id}, Amount: ${p.amount}, Status: ${p.status}, Type: ${p.type}, Method: ${p.method}, Date: ${p.createdAt}, Ref: ${p.refNo || p.referenceNo}`);
  });

  console.log("\n--- Tutes Access ---");
  student.tutes.forEach(t => {
    console.log(`TuteStock ID: ${t.tuteStockId}, Status: ${t.status}, Month: ${t.month}`);
  });
  
  // Also check if there are any orphaned payments by this reference or phone
  const onlinePayments = await prisma.payment.findMany({
    where: {
      studentId: student.id,
      method: 'online'
    }
  });
  console.log("\n--- Online Payments for this Student ---");
  console.log(onlinePayments);

}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
