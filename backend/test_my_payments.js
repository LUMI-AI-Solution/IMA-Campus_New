const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const studentId = 951;
    const payments = await prisma.payment.findMany({
        where: { studentId: parseInt(studentId) },
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
            method: p.method,
            amount: p.amount || 0,
            remark: p.remark
        };
    });
    console.log(formattedPayments);
}
main().catch(console.error).finally(() => prisma.$disconnect());
