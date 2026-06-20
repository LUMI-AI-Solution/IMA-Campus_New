const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const leads = await prisma.lead.findMany({ 
        where: { name: { contains: 'Chuty Kavi' } }, 
        include: { assignedStaff: true, business: true, batch: true } 
    });
    console.log(JSON.stringify(leads, null, 2));
}
main().finally(() => {
    prisma.$disconnect();
    process.exit(0);
});
