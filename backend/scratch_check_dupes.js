const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const leads = await prisma.lead.findMany({
        where: { phone: { contains: '94714941559' } }
    });
    console.log(leads.map(l => ({ id: l.id, phone: l.phone, batchId: l.batchId, status: l.status, name: l.name })));
}
main().finally(() => prisma.$disconnect());
