const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const config = await prisma.appSetting.findUnique({ where: { key: 'GSHEET_CONFIGS' } });
  if (config && config.value) {
    let valStr = config.value;
    // Remove any newlines inside the JSON string values
    valStr = valStr.replace(/\\n/g, '');
    await prisma.appSetting.update({
      where: { key: 'GSHEET_CONFIGS' },
      data: { value: valStr }
    });
    console.log("Fixed DB newlines!");
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
