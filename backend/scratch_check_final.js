const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const leads = await prisma.lead.findMany({
        where: {
            phone: { contains: '760573631' }
        }
    });
    leads.forEach(l => console.log(`Phone: ${l.phone}, ID: ${l.id}, Round: ${l.coordinationRound}, Status: ${l.openSemCallStatus}, InquiryType: ${l.inquiryType}, batchId: ${l.batchId}`));
}
main().catch(console.error).finally(() => prisma.$disconnect());
