const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const imaBusiness = await prisma.business.findFirst({
        where: { name: { contains: 'Online School' } }
    });
    if (!imaBusiness) {
        console.log("No IMA Online School found");
        return;
    }
    console.log("IMA Business ID:", imaBusiness.id);

    const fullPayments = await prisma.payment.findMany({
        where: {
            businessId: imaBusiness.id,
            payment_type: 3,
            status: { in: [1, 4] }
        },
        include: {
            group: true,
            student: true
        }
    });

    console.log(`Found ${fullPayments.length} full payments for IMA Online School`);
    if (fullPayments.length > 0) {
        console.log("Sample full payment:", fullPayments[0]);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
