const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllLeads() {
    try {
        const leads = await prisma.lead.findMany({
            where: { phone: { contains: "713839496" } }
        });
        console.log("All Leads with this phone:", JSON.stringify(leads, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkAllLeads();
