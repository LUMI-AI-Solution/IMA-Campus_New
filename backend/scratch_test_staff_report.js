const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    try {
        const dateFrom = "2026-07-09";
        const dateTo = "2026-07-10";
        const verificationMethod = "ai";
        const action = "approved";

        let whereClause = {
            status: { in: [1, 4] }
        };

        if (action === 'approved') {
            whereClause.status = 1;
        } else if (action === 'rejected') {
            whereClause.status = 4;
        }

        if (verificationMethod === 'ai') {
            whereClause.aiVerified = true;
        } else if (verificationMethod === 'manual') {
            whereClause.aiVerified = false;
        }

        if (dateFrom || dateTo) {
            whereClause.updatedAt = {};
            if (dateFrom) {
                const start = new Date(dateFrom);
                start.setHours(0, 0, 0, 0);
                whereClause.updatedAt.gte = start;
            }
            if (dateTo) {
                const end = new Date(dateTo);
                end.setHours(23, 59, 59, 999);
                whereClause.updatedAt.lte = end;
            }
        }

        console.log(JSON.stringify(whereClause, null, 2));

        const payments = await prisma.payment.findMany({
            where: whereClause,
            include: {
                student: { select: { firstName: true, lastName: true, business: { select: { name: true } } } },
                batch: { select: { name: true } },
                actionedUser: { select: { username: true } }
            },
            orderBy: { updatedAt: 'desc' }
        });
        console.log("Success, count:", payments.length);
    } catch (e) {
        console.error("Prisma error:", e);
    } finally {
        await prisma.$disconnect();
    }
}
test();
