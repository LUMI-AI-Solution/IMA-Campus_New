const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function check() {
    const leads = await p.lead.findMany({
        where: { phone: { startsWith: '07' } },
        take: 20
    });
    console.log("Newly found 07 leads:");
    leads.forEach(l => {
        console.log(`ID: ${l.id}, Phone: ${l.phone}, Src: ${l.source}, Camp: ${l.campaignType}, Inq: ${l.inquiryType}, Updated: ${l.updatedAt}`);
    });
    
    // Also let's check one specific number that was in the screenshot
    const spec = await p.lead.findMany({
        where: { phone: { contains: '04113811' } }
    });
    console.log("\nSpecific 04113811 leads:");
    spec.forEach(l => {
        console.log(`ID: ${l.id}, Phone: ${l.phone}, Src: ${l.source}, Camp: ${l.campaignType}, Inq: ${l.inquiryType}`);
    });
}

check().then(() => p.$disconnect());
