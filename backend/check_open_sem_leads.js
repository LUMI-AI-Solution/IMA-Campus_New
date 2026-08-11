const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.findMany({
        where: { inquiryType: 'OPEN_SEMINAR', campaignType: 'AFTER_SEMINAR' },
        include: { messages: true }
    });
    
    let legitCount = 0;
    let badCount = 0;
    for (const l of leads) {
        const hasOpenSem = l.messages.some(m => 
            m.message && 
            (m.message.trim().toLowerCase() === 'open seminar' || m.message.trim().toLowerCase() === 'opening seminar') &&
            m.direction === 'inbound'
        );
        if (hasOpenSem) {
            legitCount++;
        } else {
            badCount++;
        }
    }
    console.log(`Legit Open Seminar Leads: ${legitCount}`);
    console.log(`Bad Open Seminar Leads: ${badCount}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
