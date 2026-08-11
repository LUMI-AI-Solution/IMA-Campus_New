const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const group = await prisma.group.findUnique({
        where: { id: 50 },
        include: { courses: true }
    });
    console.log("Group 50 courses:", group.courses.map(c => ({id: c.id, name: c.name})));
}

main().finally(() => prisma.$disconnect());
