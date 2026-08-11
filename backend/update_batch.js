const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    await prisma.batch.update({
        where: { id: 5 },
        data: { endMonth: "FEBRUARY" }
    });
    console.log("Updated batch ID 5 endMonth to FEBRUARY");
}
main().catch(console.error).finally(() => prisma.$disconnect());
