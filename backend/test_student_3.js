const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const student = await prisma.user.findUnique({
        where: { id: 1058 },
        include: { payments: { include: { business: true, batch: true }, orderBy: { created_at: 'desc' } } }
    });
    
    if (!student) {
        console.log("Student not found");
        return;
    }
    console.log("Student:", student.firstName, student.lastName, student.phone);
    console.log("Payments count:", student.payments.length);
    student.payments.forEach(p => {
        console.log(`Payment ID: ${p.id}, Status: ${p.status}, Subjects: ${p.subjects}, Business: ${p.business?.name}, Batch: ${p.batch?.name}`);
    });
    
    let subjectIds = [];
    student.payments.forEach(p => {
        if (p.subjects) {
            try { 
                const subs = JSON.parse(p.subjects); 
                subjectIds.push(...subs.map(id => parseInt(id))); 
            } catch(e) {}
        }
    });
    
    console.log("Subject IDs:", subjectIds);
    if (subjectIds.length > 0) {
        const enrolledCourses = await prisma.course.findMany({ where: { id: { in: subjectIds } } });
        console.log("Enrolled Courses:", enrolledCourses.map(c => c.name));
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
