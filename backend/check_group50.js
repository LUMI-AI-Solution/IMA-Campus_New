const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const group = await prisma.group.findUnique({
        where: { id: 50 },
        include: { courses: true }
    });
    console.log(JSON.stringify(group.courses.map(c => ({id: c.id, name: c.name, groupId: c.groupId})), null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
