const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findBatches() {
    const business = await prisma.business.findFirst({
        where: { name: { contains: "O/L" } }
    });
    
    if (!business) {
        console.log("Business not found");
        return;
    }
    console.log("Business found:", business.name, "ID:", business.id);

    const batches = await prisma.batch.findMany({
        where: { businessId: business.id }
    });

    console.log("Batches:");
    batches.forEach(b => console.log(`- ${b.name} (ID: ${b.id})`));
}

findBatches().catch(console.error).finally(() => prisma.$disconnect());
