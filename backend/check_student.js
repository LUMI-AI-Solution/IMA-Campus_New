const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStudentPayments() {
    try {
        const student = await prisma.user.findFirst({
            where: { phone: { contains: '1062840' } },
            include: { 
                payments: {
                    include: { actionedUser: true, group: true }
                } 
            }
        });
        
        console.log("Student:", JSON.stringify(student, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkStudentPayments();
