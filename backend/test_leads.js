const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.findMany({
        where: {
            phone: { in: ['94713992135', '94740854781', '94713200486', '94767099811'] }
        },
        include: { batch: true }
    });
    console.log("Leads from DB:");
    leads.forEach(l => {
        console.log(`ID: ${l.id}, Phone: ${l.phone}, BatchID: ${l.batchId}, AssignedTo: ${l.assignedTo}, Status: ${l.status}, CallStatus: ${l.callStatus}`);
    });
}
main().catch(console.error).finally(() => prisma.$disconnect());
