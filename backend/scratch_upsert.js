const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    const existing = await prisma.lead.findUnique({ where: { id: 44340 } });
    console.log("Before:", existing.sequenceCompleted);
    
    const updated = await prisma.lead.upsert({
        where: { id: 44340 },
        update: { sequenceCompleted: false },
        create: { phone: 'test', campaignType: 'test' } // dummy
    });
    console.log("After:", updated.sequenceCompleted);
}
test().finally(() => prisma.$disconnect());
