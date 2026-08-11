const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function showLeads() {
    const leads = await prisma.lead.findMany({
        where: { phone: { contains: "761083012" } },
        include: {
            assignedUser: { select: { id: true, firstName: true, lastName: true } },
            messages: { orderBy: { id: 'desc' }, take: 3 }
        }
    });

    console.log("=== All Leads matching 761083012 ===");
    leads.forEach(l => {
        console.log(`\nLead ID: ${l.id}`);
        console.log(`  Name: ${l.name}`);
        console.log(`  Phone: ${l.phone}`);
        console.log(`  CampaignType: ${l.campaignType}`);
        console.log(`  InquiryType: ${l.inquiryType}`);
        console.log(`  Status: ${l.status}`);
        console.log(`  AssignedTo: ${l.assignedTo} (${l.assignedUser ? l.assignedUser.firstName + ' ' + l.assignedUser.lastName : 'UNASSIGNED'})`);
        console.log(`  LastMessage: "${l.lastMessage}"`);
        console.log(`  LastMessageAt: ${l.lastMessageAt}`);
        console.log(`  UpdatedAt: ${l.updatedAt}`);
        console.log(`  Recent Messages:`, l.messages.map(m => `[${m.direction}] ${m.message} (${m.createdAt})`));
    });
}

showLeads().catch(console.error).finally(() => prisma.$disconnect());
