const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const crossMsgs = await prisma.chatMessage.findMany({
        where: {
            message: { contains: 'ටක් ගාලා ටෙක් කරමු' },
            senderName: 'AutoBot',
            lead: { phone: { contains: '_BIZ_9' } }
        },
        include: { lead: true }
    });
    const uniqueLeads = new Set(crossMsgs.map(m => m.lead.phone));
    console.log(`Found ${uniqueLeads.size} Art leads with Tech auto-replies.`);
}
main().finally(() => prisma.$disconnect());
