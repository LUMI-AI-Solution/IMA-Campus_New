const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { firstName: { contains: 'Githma' } },
        { firstName: { contains: 'Sasindu' } }
      ]
    }
  });
  console.log("Users:", JSON.stringify(users, null, 2));
  
  if (users.length > 0) {
    const userIds = users.map(u => u.id);
    const payments = await prisma.payment.findMany({
      where: { studentId: { in: userIds } },
      include: { group: true }
    });
    console.log("Payments:", JSON.stringify(payments, null, 2));
  }
}
check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
