const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const studentId = 2024;
    const groupId = 208;

    const payments = await prisma.payment.findMany({
        where: { 
            studentId: studentId, 
            groupId: groupId 
        },
        include: {
            delivery: true
        }
    });

    console.log("Payments for student 2024 in group 208:");
    console.log(JSON.stringify(payments, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
