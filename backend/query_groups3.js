const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const batch = await prisma.batch.findFirst({
        where: { name: { contains: "2027 MAY INTAKE" } },
        select: { id: true, name: true, startMonth: true, endMonth: true }
    });
    console.log("Batch:", batch);
}
main().catch(console.error).finally(() => prisma.$disconnect());
