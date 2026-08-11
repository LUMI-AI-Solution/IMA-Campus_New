const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    const count = await prisma.payment.count({
        where: {
            status: { in: [1, 4] },
            aiVerified: false,
            updatedAt: {
                gte: new Date("2026-07-08T00:00:00.000Z"),
                lte: new Date("2026-07-10T23:59:59.999Z")
            }
        }
    });
    console.log("Count for 07-08 to 07-10:", count);

    const countAll = await prisma.payment.count({
        where: {
            status: { in: [1, 4] },
            aiVerified: false
        }
    });
    console.log("Count All manual:", countAll);
    process.exit(0);
}
test();
