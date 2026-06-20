const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function check() {
    const midu = await prisma.user.findFirst({ where: { firstName: { contains: 'Midu' } } });
    if (!midu) return console.log("Not found");
    const miduId = midu.id;
    console.log("Midu ID:", miduId);

    const bizId = 1;
    const batchId = 5;

    const afterSeminarCount = await prisma.lead.count({
        where: {
            campaignType: 'AFTER_SEMINAR',
            source: { not: 'system' },
            assignedTo: miduId,
            batchId: batchId,
            NOT: {
                AND: [
                    { source: 'bridge_transfer' },
                    { lastMessage: null }
                ]
            }
        }
    });

    console.log("After Seminar CRM Count (Midu):", afterSeminarCount);

    const newInqCount = await prisma.lead.count({
        where: {
            campaignType: 'AFTER_SEMINAR',
            inquiryType: 'NEW_INQ',
            assignedTo: miduId,
            batchId: batchId,
            NOT: { source: 'bridge_transfer', lastMessage: null }
        }
    });

    const openSemCount = await prisma.lead.count({
        where: {
            campaignType: 'AFTER_SEMINAR',
            inquiryType: { in: ['OPEN_SEMINAR', 'NORMAL'] },
            assignedTo: miduId,
            batchId: batchId,
            NOT: { source: 'bridge_transfer', lastMessage: null }
        }
    });

    const paidCount = await prisma.lead.count({
        where: {
            campaignType: 'AFTER_SEMINAR',
            inquiryType: 'PAID_CAMP',
            assignedTo: miduId,
            batchId: batchId,
            NOT: { source: 'bridge_transfer', lastMessage: null }
        }
    });

    console.log("Manager Stats (New Inq):", newInqCount);
    console.log("Manager Stats (Open Sem):", openSemCount);
    console.log("Manager Stats (Paid):", paidCount);
    console.log("Sum:", newInqCount + openSemCount + paidCount);
}
check().finally(() => prisma.$disconnect());
