const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        const allLeads = await prisma.lead.findMany({
            where: { campaignType: 'AFTER_SEMINAR' },
            select: { id: true, phone: true, inquiryType: true, batchId: true, assignedTo: true }
        });
        
        const leadsByPhone = {};
        allLeads.forEach(l => {
            const cleanPhone = l.phone.split('_')[0].replace(/[^0-9]/g, '');
            if (!leadsByPhone[cleanPhone]) leadsByPhone[cleanPhone] = [];
            leadsByPhone[cleanPhone].push(l);
        });
        
        let typeCombos = {};
        for (const phone in leadsByPhone) {
            if (leadsByPhone[phone].length > 1) {
                const types = leadsByPhone[phone].map(l => l.inquiryType).sort().join(' + ');
                typeCombos[types] = (typeCombos[types] || 0) + 1;
            }
        }
        
        console.log("Duplicate Type Combinations:");
        console.log(typeCombos);
        
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
run();
