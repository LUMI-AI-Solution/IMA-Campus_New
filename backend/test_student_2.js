const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const student = await prisma.user.findUnique({
        where: { id: 2852 },
        include: { payments: { include: { business: true, batch: true }, orderBy: { created_at: 'desc' } } }
    });
    
    if (!student) {
        console.log("Student not found");
        return;
    }
    console.log("Student:", student.firstName, student.lastName, student.phone);
    console.log("Payments count:", student.payments.length);
    student.payments.forEach(p => {
        console.log(`Payment ID: ${p.id}, Status: ${p.status}, Subjects: ${p.subjects}`);
    });
}
main().catch(console.error).finally(() => prisma.$disconnect());
