const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    const leads = await prisma.lead.findMany({
        take: 10,
        where: { phase: 2 }, // Assuming phase 2 is paid
        include: { batch: true }
    });
    console.log(leads.map(l => l.id + " " + l.phone + " batch:" + (l.batch ? l.batch.id : 'none')));
}
test();
