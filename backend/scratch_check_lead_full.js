const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const lead = await prisma.lead.findUnique({
        where: { id: 57329 },
        include: { assignedUser: true }
    });
    console.log(JSON.stringify(lead, null, 2));
    await prisma.$disconnect();
}
check();
