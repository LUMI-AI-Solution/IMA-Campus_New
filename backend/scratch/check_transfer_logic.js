const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Just find a few leads that are in 'PAID_CAMP' or 'NORMAL'
    const normalLeads = await prisma.lead.findMany({
        where: { inquiryType: 'NORMAL' },
        take: 1
    });
    console.log("Normal:", normalLeads.map(l => ({ id: l.id, status: l.enrollmentStatus })));
}
main().catch(console.error).finally(() => prisma.$disconnect());
