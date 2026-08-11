const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const pendingSlips = await prisma.payment.findMany({
            where: { status: 0, method: 'BANK_TRANSFER' },
            orderBy: { createdAt: 'asc' },
            include: { student: true, business: true, batch: true }
        });
        console.log("Success! Count:", pendingSlips.length);
    } catch (e) {
        console.error("Error:", e);
    }
}
main().then(() => prisma.$disconnect());
