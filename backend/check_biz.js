const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const biz = await prisma.business.findMany();
    biz.forEach(b => console.log(`ID: ${b.id}, Name: "${b.name}"`));
}
main().catch(console.error).finally(() => prisma.$disconnect());
