const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const user = await prisma.user.findFirst({ where: { phone: "0772658017" } });
    if (!user) {
        console.log("User not found");
        return;
    }
    console.log("Student ID:", user.id);
    
    const payments = await prisma.payment.findMany({
        where: { studentId: user.id },
        include: {
            group: true
        }
    });
    
    console.log("Payments:");
    for (const p of payments) {
        console.log(`Payment ID: ${p.id}, Status: ${p.status}, Group: ${p.group?.name}, Subjects: ${p.subjects}`);
    }
}
check().finally(() => prisma.$disconnect());
