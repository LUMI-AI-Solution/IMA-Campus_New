const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const leads = await prisma.lead.findMany({
        where: {
            OR: [
                { phone: { contains: '760573631' } },
                { phone: { contains: '770064258' } },
                { phone: { contains: '771754128' } },
                { phone: { contains: '784466855' } }
            ]
        },
        include: {
            batch: true
        }
    });

    console.log("Leads found:");
    leads.forEach(l => {
        console.log(`Phone: ${l.phone}, Round: ${l.coordinationRound}, Status: ${l.openSemCallStatus}, Batch: ${l.batch?.name} (ID: ${l.batchId})`);
    });
}
main().catch(console.error).finally(() => prisma.$disconnect());
