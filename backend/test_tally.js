const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const batchId = 1; 
    const midu = await prisma.user.findFirst({
        where: { firstName: { contains: 'Midu' } }
    });
    if (!midu) { console.log("Midu not found"); return; }

    const allCampaignLeads = await prisma.lead.findMany({
        where: { campaignType: 'AFTER_SEMINAR', assignedTo: midu.id }
    });
    const payments = await prisma.payment.findMany({
        where: { status: { in: [0, 1, 4] } },
        include: { student: true }
    });

    console.log(`--- TALLY FOR MIDU ---`);
    console.log(`Total assigned leads: ${allCampaignLeads.length}`);
    let withPay = 0, noPay = 0;
    const getLast9 = (phone) => {
        if (!phone) return '';
        const clean = phone.replace(/\D/g, '');
        return clean.length >= 9 ? clean.slice(-9) : clean;
    };
    allCampaignLeads.forEach(lead => {
        const l9 = getLast9(lead.phone.split('_')[0]);
        const has = payments.some(p => getLast9(p.student?.phone || p.student?.whatsapp) === l9);
        if (has) withPay++; else noPay++;
    });
    console.log(`Leads with >= 1 payment (Paid Campaign): ${withPay}`);
    console.log(`Leads with NO payment (Skipped): ${noPay}`);
}
run().catch(console.error).finally(() => prisma.$disconnect());
