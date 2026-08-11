const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const quotas = await prisma.autoAssignQuota.findMany({
        where: { isActive: true },
        include: { staff: { select: { firstName: true, role: true, id: true } } }
    });
    console.log(JSON.stringify(quotas, null, 2));
    await prisma.$disconnect();
}
check();
