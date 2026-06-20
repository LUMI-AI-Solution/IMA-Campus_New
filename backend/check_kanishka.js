const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const student = await prisma.user.findFirst({
        where: { phone: { contains: '754854195' } },
        include: {
            payments: {
                include: { batch: true, business: true, group: true }
            }
        }
    });

    if (!student) {
        console.log("Student not found");
        return;
    }

    console.log("=== Student ===");
    console.log("Name:", student.firstName + ' ' + student.lastName, "Phone:", student.phone, "ID:", student.id);
    
    console.log("\n=== Payments ===");
    student.payments?.forEach(p => {
        console.log(`- ID: ${p.id}, Amount: ${p.amount}, Batch: ${p.batch ? p.batch.name : 'N/A'}, Type: ${p.payment_type}, MonthGroup: ${p.group ? p.group.name : (p.groupId || 'N/A')}, Status: ${p.status}, Action: ${p.action}, Subjects: ${p.subjects}`);
    });
}
check().catch(console.error).finally(() => prisma.$disconnect());
