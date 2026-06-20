const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const setting = await prisma.appSetting.findUnique({ where: { key: 'GEMINI_API_KEY' } });
    console.log("Keys:", setting ? setting.value : "NONE");
}
main().catch(console.error).finally(() => prisma.$disconnect());
