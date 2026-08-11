const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({ select: { businessType: true }, distinct: ['businessType'] });
  const businesses = await prisma.business.findMany({ select: { name: true } });
  console.log("Users Business Types:", users);
  console.log("Businesses:", businesses);
}
main();
