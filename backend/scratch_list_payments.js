const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const studentId = 1;
    const payments = await prisma.payment.findMany({
        where: { 
            studentId: parseInt(studentId),
            OR: [
                { status: { not: 5 } },
                {
                    status: 5,
                    OR: [
                        { due_date: { not: null } },
                        { method: 'Upcoming' }
                    ]
                }
            ]
        },
        orderBy: { created_at: 'desc' }
    });
    console.log(`Found ${payments.length} payments for Student ${studentId}`);
    payments.forEach(p => console.log(`ID: ${p.id}, Method: ${p.method}, Status: ${p.status}, CreatedAt: ${p.created_at}`));
}
run().catch(console.error).finally(() => prisma.$disconnect());
