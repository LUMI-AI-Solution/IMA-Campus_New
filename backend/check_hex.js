const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const biz = await prisma.business.findMany({ where: { id: { in: [17, 19] } } });
    biz.forEach(b => {
        console.log(b.id, b.name);
        console.log(Buffer.from(b.name).toString('hex'));
    });
}
main().catch(console.error).finally(() => prisma.$disconnect());
