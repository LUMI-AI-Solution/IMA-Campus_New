const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const biz = await prisma.business.findMany({
        where: {
            id: { in: [17, 19] }
        }
    });
    console.log(biz.map(b => `'${b.name}'`).join('\n'));
}
main().catch(console.error).finally(() => prisma.$disconnect());
