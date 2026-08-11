const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    await prisma.lead.updateMany({
        where: { phone: { in: ['94765652305_BIZ_17_BATCH_36_AS', '94762450820_BIZ_17_BATCH_36_AS'] } },
        data: { inquiryType: 'NEW_INQ' }
    });
    console.log("Updated inquiryType to NEW_INQ for Janith and Chamodya");
}
main().finally(() => prisma.$disconnect());
