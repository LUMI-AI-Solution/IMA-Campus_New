const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const query = "62443605";
  const users = await prisma.user.findMany({
    where: { phone: { contains: query } },
    include: { payments: true }
  });
  console.log("Users:", users.map(u => ({ id: u.id, phone: u.phone, payments: u.payments.length })));
}

main().finally(() => prisma.$disconnect());
