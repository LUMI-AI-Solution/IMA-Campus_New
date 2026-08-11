const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const biz = await prisma.business.findMany();
    biz.forEach(b => {
        if (b.name.includes(',')) {
            console.log("COMMA FOUND IN:", b.name);
        }
    });
    console.log("Done checking commas.");
}
main().catch(console.error).finally(() => prisma.$disconnect());
