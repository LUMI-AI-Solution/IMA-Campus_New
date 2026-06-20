const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const setting = await prisma.appSetting.findUnique({ where: { key: 'GSHEET_CONFIGS' } });
  console.log(setting.value);
}
main().catch(console.error).finally(() => prisma.$disconnect());
