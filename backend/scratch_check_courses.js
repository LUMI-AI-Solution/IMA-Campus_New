const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCourses() {
    const c1 = await prisma.course.findUnique({ where: { id: 321 } });
    const c2 = await prisma.course.findUnique({ where: { id: 322 } });
    console.log('Course 321:', c1.name, 'Business:', c1.businessId, 'Batch:', c1.batchId);
    console.log('Course 322:', c2.name, 'Business:', c2.businessId, 'Batch:', c2.batchId);
}
checkCourses().finally(() => prisma.$disconnect());
