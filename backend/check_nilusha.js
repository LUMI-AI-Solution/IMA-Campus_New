const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkNilusha() {
    const user = await prisma.user.findFirst({
        where: { firstName: { contains: 'Nilusha' } }
    });
    console.log("Nilusha Data:", user);

    const businessStaff = await prisma.user.findMany({
        where: {
            role: { notIn: ['Student', 'USER', 'STUDENT'] }
        }
    });

    console.log("All Staff Roles:", businessStaff.map(u => ({id: u.id, name: u.firstName, role: u.role, bizId: u.businessId, bizType: u.businessType})));
}

checkNilusha().catch(console.error).finally(() => prisma.$disconnect());
