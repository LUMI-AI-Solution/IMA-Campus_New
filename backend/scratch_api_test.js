const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
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
            include: { business: true, batch: true, group: true },
            orderBy: { created_at: 'desc' }
        });
        
    const formattedPayments = payments.map(p => {
            let frontendStatus = p.status;
            if (p.status === 0 && p.method === 'Slip') frontendStatus = -1; 
            else if (p.status === 0 && p.method === 'Upcoming') frontendStatus = 0; 

            return {
                id: p.id,
                status: frontendStatus,
                method: p.method
            };
        });
        
    console.log("Formatted payments:", formattedPayments);
}
test().finally(() => prisma.$disconnect());
