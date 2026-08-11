const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Finding Harshani...");
  const users = await prisma.user.findMany({
    where: {
      firstName: { contains: 'Harshani' }
    }
  });
  console.log(users.map(u => ({ id: u.id, name: u.firstName + ' ' + u.lastName })));

  console.log("\nFinding Businesses...");
  const biz = await prisma.business.findMany();
  console.log(biz.map(b => ({ id: b.id, name: b.name })));

  console.log("\nFinding Batches...");
  const batches = await prisma.batch.findMany({
    where: {
      name: { contains: 'July' }
    }
  });
  console.log(batches.map(b => ({ id: b.id, name: b.name, bizId: b.businessId })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
