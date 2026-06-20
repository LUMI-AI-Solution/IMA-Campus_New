const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStaff() {
    const user = await prisma.user.findFirst({
        where: { firstName: { contains: 'Raveesha' } }
    });
    console.log(user);
}

checkStaff().finally(() => prisma.$disconnect());
