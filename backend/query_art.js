const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.findMany({
        where: { campaignType: 'AFTER_SEMINAR', lastMessage: { contains: 'Template Output' } },
        include: { messages: true },
        take: 5,
        orderBy: { updatedAt: 'desc' }
    });
    
    leads.forEach(l => {
        console.log(`\nLead ID: ${l.id}, Phone: ${l.phone}, LastMessage: ${l.lastMessage}, InquiryType: ${l.inquiryType}`);
    });
}
main().catch(console.error).finally(() => prisma.$disconnect());
