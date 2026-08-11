const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const covered = await prisma.leadRoundProgress.count({
    where: {
      callStatus: { not: 'pending' },
      campaignCategory: 'NEW_INQ'
    }
  });
  console.log('Covered New Inq Round Progresses:', covered);
  process.exit(0);
}
check();
