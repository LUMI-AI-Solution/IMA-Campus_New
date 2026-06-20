const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const student = await prisma.user.findUnique({ where: { phone: '0714941559' } });
    if (!student) {
        console.log("Student not found!");
        return;
    }
    console.log("Student ID:", student.id, student.firstName);

    const batch = await prisma.batch.findFirst({
        where: { status: 1 },
        include: {
            groups: true,
            business: true
        }
    });

    console.log("Business ID:", batch.businessId);
    console.log("Batch ID:", batch.id);
    batch.groups.forEach(g => {
        console.log("Group ID:", g.id, g.name, "Type:", g.type);
    });

    const courses = await prisma.course.findMany({ where: { groupId: batch.groups[0].id } });
    console.log("Course IDs:", courses.map(c => c.id));
}
run().then(() => prisma.$disconnect());
