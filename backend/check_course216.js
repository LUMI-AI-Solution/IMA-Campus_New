const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const course = await prisma.course.findUnique({
        where: { id: 216 }
    });
    console.log(course.groupPrices);
}

main().catch(console.error).finally(() => prisma.$disconnect());
