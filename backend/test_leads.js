const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.findMany({
        where: { phone: { contains: "_BATCH_40" } },
        select: { id: true, phone: true }
    });
    console.log("Leads matching BATCH_40:", leads.length);
    console.log(leads.slice(0, 5));
    
    const leads2 = await prisma.lead.findMany({
        where: { batchId: 40 },
        select: { id: true, phone: true }
    });
    console.log("Leads with batchId=40:", leads2.length);
}
main().catch(console.error).finally(() => prisma.$disconnect());
