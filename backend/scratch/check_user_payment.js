const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const query = "62443605";
  
  // Search in User (student)
  const users = await prisma.user.findMany({
    where: {
      phone: { contains: query }
    }
  });
  
  console.log("Found Users:", users.map(u => ({ id: u.id, phone: u.phone, firstName: u.firstName, role: u.role })));

  if (users.length > 0) {
    const userIds = users.map(u => u.id);
    const payments = await prisma.payment.findMany({
      where: {
        studentId: { in: userIds }
      }
    });
    console.log("Payments for these users:", payments.map(p => ({
        id: p.id,
        amount: p.amount,
        method: p.method,
        status: p.status,
        createdAt: p.created_at,
        batchId: p.batchId
    })));
    
    // Check ContentCourse access or similar to see if they got access
    // Or TuteStock?
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
