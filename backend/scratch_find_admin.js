const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const users = await prisma.user.findMany({
        where: { role: 'superadmin' }
    });
    console.log("SuperAdmins:", users.map(u => ({ id: u.id, name: u.firstName })));

    // Let's check the most recent leads for Free Seminar
    const leads = await prisma.lead.findMany({
        where: { campaignType: 'FREE_SEMINAR', assignedTo: { not: null } },
        orderBy: { id: 'desc' },
        take: 10,
        select: { id: true, name: true, assignedTo: true, status: true, source: true }
    });
    console.log("\nRecent Assigned Leads:");
    console.table(leads);

    await prisma.$disconnect();
}
check();
