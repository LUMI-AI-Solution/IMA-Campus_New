const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
    const count = await prisma.lead.count({
        where: { 
            campaignType: 'FREE_SEMINAR', 
            assignedTo: 341
        }
    });
    console.log("Total FREE_SEMINAR leads for Thisuri:", count);
}
run();
