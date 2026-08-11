const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    let corePhone = '769912192'; // 0769912192
    const student = await prisma.user.findFirst({
        where: {
            OR: [ { phone: { contains: corePhone } }, { whatsapp: { contains: corePhone } } ],
            role: { in: ['Student', 'USER', 'user', 'student'] }
        },
        include: { payments: { include: { business: true, batch: true }, orderBy: { created_at: 'desc' } } }
    });
    
    if (!student) {
        console.log("Student not found");
        return;
    }
    console.log("Student:", student.firstName, student.lastName, student.id);
    
    let subjectIds = [];
    student.payments.forEach(p => {
        console.log(`Payment ID: ${p.id}, Status: ${p.status}, Subjects: ${p.subjects}`);
        if (p.subjects) {
            try { 
                const subs = JSON.parse(p.subjects); 
                subjectIds.push(...subs.map(id => parseInt(id))); 
            } catch(e) {
                console.log("Parse error:", e);
            }
        }
    });
    
    console.log("Subject IDs:", subjectIds);
    if (subjectIds.length > 0) {
        const enrolledCourses = await prisma.course.findMany({ where: { id: { in: subjectIds } } });
        console.log("Enrolled Courses:", enrolledCourses.map(c => c.name));
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
