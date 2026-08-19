const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.findMany({
        where: { batchId: 5 }
    });
    console.log("Leads for Batch 5:");
    leads.forEach(l => {
        console.log(`ID: ${l.id}, Phone: ${l.phone}, BatchID: ${l.batchId}, AssignedTo: ${l.assignedTo}, Status: ${l.status}, CallStatus: ${l.callStatus}`);
    });
}
main().catch(console.error).finally(() => prisma.$disconnect());
