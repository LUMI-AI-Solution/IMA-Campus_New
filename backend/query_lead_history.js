const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const history = await prisma.leadRoundProgress.findMany({
    where: {
      lead: { phone: '94702572577_BIZ_4' }
    }
  });
  console.log(JSON.stringify(history, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
