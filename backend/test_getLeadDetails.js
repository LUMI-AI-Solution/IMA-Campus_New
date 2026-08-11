const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    let corePhone = "767264283";
    const students = await prisma.user.findMany({
        where: {
            OR: [ { phone: { contains: corePhone } }, { whatsapp: { contains: corePhone } } ],
            role: { in: ['Student', 'USER', 'user', 'student'] }
        },
        include: { payments: { include: { business: true, batch: true }, orderBy: { created_at: 'desc' } } }
    });
    
    let bestStudent = students.find(s => s.payments && s.payments.length > 0) || students[0];
    let allPayments = [];
    students.forEach(s => { if(s.payments) allPayments.push(...s.payments); });
    
    const uniquePaymentsMap = new Map();
    allPayments.forEach(p => uniquePaymentsMap.set(p.id, p));
    bestStudent.payments = Array.from(uniquePaymentsMap.values()).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    let enrolledCourses = [];
    if (bestStudent.payments.length > 0) {
        let subjectIds = [];
        bestStudent.payments.forEach(p => {
            if (p.subjects) {
                try { 
                    p.parsedSubjectIds = JSON.parse(p.subjects).map(id => parseInt(id)); 
                    subjectIds.push(...p.parsedSubjectIds); 
                } catch(e) { p.parsedSubjectIds = []; }
            } else p.parsedSubjectIds = [];
        });
        if (subjectIds.length > 0) {
            enrolledCourses = await prisma.course.findMany({ where: { id: { in: subjectIds } } });
            bestStudent.payments.forEach(p => {
                p.courses = enrolledCourses.filter(c => p.parsedSubjectIds.includes(c.id));
            });
        }
    }
    
    console.log(JSON.stringify(bestStudent.payments, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
