const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Checking Semila Dilshani (0750926887 / 750926887)...");

    // 1. Search in Lead table
    const leads = await prisma.lead.findMany({
        where: {
            phone: { contains: '750926887' }
        },
        include: { batch: true, assignedUser: true }
    });

    console.log("Found CRM Leads:", JSON.stringify(leads, null, 2));

    // 2. Search in User/Student table
    const students = await prisma.user.findMany({
        where: {
            OR: [
                { phone: { contains: '750926887' } },
                { whatsapp: { contains: '750926887' } },
                { optionalPhone: { contains: '750926887' } }
            ]
        }
    });

    console.log("Found Web Students:", JSON.stringify(students, null, 2));

    // 3. Search in Payment table for these students
    if (students.length > 0) {
        const studentIds = students.map(s => s.id);
        const payments = await prisma.payment.findMany({
            where: { studentId: { in: studentIds } },
            include: { batch: true, business: true }
        });
        console.log("Found Payments:", JSON.stringify(payments, null, 2));
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
