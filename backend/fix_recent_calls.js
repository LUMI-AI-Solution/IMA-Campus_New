const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
    const calls = await prisma.whatsAppCallRecord.findMany({ 
        where: { status: 'MISSED' },
        orderBy: { createdAt: 'desc' },
        take: 3
    });
    for (const call of calls) {
        await prisma.whatsAppCallRecord.update({
            where: { id: call.id },
            data: { status: 'COMPLETED', duration: 105 } // approximate 1.45m
        });
        console.log(`Updated ${call.id} to COMPLETED`);
    }
    console.log("Done");
}
fix();
