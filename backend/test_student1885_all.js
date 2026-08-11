const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const students = await prisma.user.findMany({
        where: {
            OR: [
                { phone: { contains: '779074042' } },
                { whatsapp: { contains: '779074042' } }
            ]
        },
        include: { payments: true }
    });
    console.log(JSON.stringify(students, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
