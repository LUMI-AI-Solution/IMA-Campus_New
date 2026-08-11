const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    // 1. Update Chamindu's lead to have _AS
    const chamindu = await prisma.lead.findFirst({
        where: { phone: '94714941559_BIZ_17_BATCH_36', campaignType: 'AFTER_SEMINAR' }
    });
    if (chamindu) {
        await prisma.lead.update({
            where: { id: chamindu.id },
            data: { phone: '94714941559_BIZ_17_BATCH_36_AS' }
        });
        console.log("Updated Chamindu's lead");
    }

    // 2. Recreate Janith and Chamodya
    const janith = await prisma.lead.create({
        data: {
            phone: '94765652305_BIZ_17_BATCH_36_AS',
            name: 'Janith Karunarathne',
            campaignType: 'AFTER_SEMINAR',
            batchId: 36,
            status: 'NEW',
            source: 'whatsapp',
            lastMessage: 'hi machan',
            lastMessageAt: new Date(),
            unreadCount: 1,
            phase: 1
        }
    });
    console.log("Recreated Janith");

    const chamodya = await prisma.lead.create({
        data: {
            phone: '94762450820_BIZ_17_BATCH_36_AS',
            name: 'Chamodya Sudusinhga',
            campaignType: 'AFTER_SEMINAR',
            batchId: 36,
            status: 'NEW',
            source: 'whatsapp',
            lastMessage: 'hi machan',
            lastMessageAt: new Date(),
            unreadCount: 1,
            phase: 1
        }
    });
    console.log("Recreated Chamodya");
}
main().finally(() => prisma.$disconnect());
