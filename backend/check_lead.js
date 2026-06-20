const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const leads = await prisma.lead.findMany({
    where: {
      OR: [
        { name: { contains: 'Githma' } },
        { name: { contains: 'Sasindu' } }
      ]
    }
  });
  console.log("Leads:", JSON.stringify(leads, null, 2));
  
  if (leads.length > 0) {
    const phones = leads.map(l => l.phone.split('_')[0]);
    const users = await prisma.user.findMany({
      where: {
        OR: phones.map(p => ({ phone: { contains: p } }))
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
}
check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
