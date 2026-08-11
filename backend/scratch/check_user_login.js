const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findUnique({
        where: { id: 132 },
        select: { id: true, firstName: true, phone: true, status: true, lastLoginAt: true }
    });
    console.log("User:", user);
}

main().finally(() => prisma.$disconnect());
