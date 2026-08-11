const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    const countWithNull = await prisma.payment.count({
        where: {
            status: 1,
            aiVerified: false,
            updatedAt: {
                gte: new Date("2026-07-08T00:00:00.000Z"),
                lte: new Date("2026-07-10T23:59:59.999Z")
            }
        }
    });
    
    const countWithoutNull = await prisma.payment.count({
        where: {
            status: 1,
            aiVerified: false,
            actionedById: { not: null },
            updatedAt: {
                gte: new Date("2026-07-08T00:00:00.000Z"),
                lte: new Date("2026-07-10T23:59:59.999Z")
            }
        }
    });

    console.log("Count with null:", countWithNull);
    console.log("Count without null (actual staff):", countWithoutNull);
}
test().finally(() => prisma.$disconnect());
