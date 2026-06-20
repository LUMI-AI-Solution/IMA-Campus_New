const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const b = await prisma.batch.findMany();
  console.log(b);
}
run();
