const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function check() {
    const users = await prisma.user.findMany({ where: { role: { notIn: ['Student', 'STUDENT', 'USER'] } } });
    console.log(users.map(u => `${u.id}: ${u.firstName} ${u.lastName} (Role: ${u.role})`));
}
check().finally(() => prisma.$disconnect());
