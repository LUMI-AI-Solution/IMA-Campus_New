const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const config = await prisma.appSetting.findUnique({ where: { key: 'GSHEET_CONFIGS' } });
  console.log(config ? config.value : 'Not found');
}
main().catch(console.error).finally(() => prisma.$disconnect());
