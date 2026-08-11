const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const courses = await prisma.course.findMany({
        where: { lecturerName: 'Gayan Iddamalgoda' }
    });
    courses.forEach(c => {
        console.log(`Course ID: ${c.id}, Name: ${c.name}`);
        console.log(`GroupPrices: ${c.groupPrices}`);
        console.log('---');
    });
}
main().finally(() => prisma.$disconnect());
