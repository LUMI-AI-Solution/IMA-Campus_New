const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({ where: { id: 49 } });
  
  const business = await prisma.business.findFirst({
      where: { name: user.businessType }
  });
  console.log("Harshani's Business:", business ? { id: business.id, name: business.name } : "Not found");
  
  if (business) {
      const batches = await prisma.batch.findMany({
          where: { businessId: business.id }
      });
      console.log(`Batches under business ${business.id}:`, batches.map(b => b.id));
  }
  
  const batch5 = await prisma.batch.findUnique({ where: { id: 5 }, include: { business: true } });
  const batch26 = await prisma.batch.findUnique({ where: { id: 26 }, include: { business: true } });
  
  console.log("Batch 5 Business ID:", batch5?.businessId, "Name:", batch5?.business?.name);
  console.log("Batch 26 Business ID:", batch26?.businessId, "Name:", batch26?.business?.name);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
