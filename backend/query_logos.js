const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const businesses = await prisma.business.findMany({ select: { id: true, name: true, logo: true } });
  console.log(businesses);
}
main().then(() => process.exit(0));
