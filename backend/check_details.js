const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDetails() {
    try {
        const batch = await prisma.batch.findUnique({
            where: { id: 5 },
            include: { business: true }
        });
        console.log("Batch Details:", JSON.stringify(batch, null, 2));
        
        const business6 = await prisma.business.findUnique({
            where: { id: 6 }
        });
        console.log("Business 6 Details:", JSON.stringify(business6, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkDetails();
