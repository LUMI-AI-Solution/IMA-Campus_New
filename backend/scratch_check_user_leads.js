const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const phones = ['94762509521', '94721686167', '0762509521', '0721686167'];
    
    for (const phone of phones) {
        const leads = await prisma.lead.findMany({
            where: { phone: { contains: phone } },
            include: { batch: { include: { business: true } } }
        });
        console.log(`Leads for ${phone}:`);
        for (const l of leads) {
            console.log(`- ID: ${l.id}, Name: ${l.firstName} ${l.lastName}, Phone: ${l.phone}, Batch: ${l.batch?.name}, Business: ${l.batch?.business?.name} (ID: ${l.batch?.businessId})`);
        }
    }
}
main().finally(() => prisma.$disconnect());
