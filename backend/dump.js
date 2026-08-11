const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.appSetting.findUnique({ where: { key: 'MASTER_TUTES' } })
  .then(s => console.log(s ? s.value : 'No setting found'))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
