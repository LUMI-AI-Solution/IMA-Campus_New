const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
    const quota = await prisma.autoAssignQuota.findFirst({
        where: { staffId: 1452, isActive: true }
    });
    console.log(quota);
}
run();
