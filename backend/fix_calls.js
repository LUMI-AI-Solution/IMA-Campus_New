const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
    const calls = await prisma.whatsAppCallRecord.findMany({ where: { businessId: null }});
    for (const call of calls) {
        const lead = await prisma.lead.findFirst({
            where: { phone: { startsWith: call.leadPhone } },
            include: { batch: { include: { business: true } } }
        });
        if (lead && lead.batch && lead.batch.business) {
            await prisma.whatsAppCallRecord.update({
                where: { id: call.id },
                data: { businessId: lead.batch.business.id }
            });
            console.log(`Updated call ${call.id} to business ${lead.batch.business.name}`);
        }
    }
    console.log("Done");
}
fix();
