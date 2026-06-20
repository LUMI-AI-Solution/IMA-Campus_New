const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
    const msgs = await prisma.chatMessage.findMany({
        where: { senderName: 'AutoBot' },
        include: { lead: { include: { assignedUser: true } } }
    });

    const crossLeads = new Map();

    for (const msg of msgs) {
        if (!msg.message || !msg.lead || !msg.lead.phone) continue;
        const match = msg.lead.phone.match(/_BIZ_(\d+)/);
        if (!match) continue;
        const leadBizId = parseInt(match[1]);

        let hasCross = false;
        let issue = '';

        if (msg.message.includes('කලා / වාණිජ') && leadBizId !== 9 && leadBizId !== 11) { // Assuming 9/11 are Art/Commerce
            hasCross = true;
            issue = 'Got Art/Commerce AutoReply';
        } else if (msg.message.includes('ටක් ගාලා ටෙක් කරමු') && leadBizId !== 4) {
            hasCross = true;
            issue = 'Got Tech AutoReply';
        } else if (msg.message.includes('ICT') && leadBizId !== 13) {
            hasCross = true;
            issue = 'Got ICT AutoReply';
        }

        if (hasCross) {
            crossLeads.set(msg.lead.id, {
                ID: msg.lead.id,
                Phone: msg.lead.phone,
                Name: msg.lead.name,
                AssignedTo: msg.lead.assignedUser ? `${msg.lead.assignedUser.firstName} ${msg.lead.assignedUser.lastName}` : 'Unassigned',
                LeadBusiness: leadBizId,
                Issue: issue
            });
        }
    }

    const suspiciousLeads = Array.from(crossLeads.values());
    const csvRows = ['ID,Phone,Name,AssignedTo,LeadBusiness,Issue'];
    for (const s of suspiciousLeads) {
        csvRows.push(`${s.ID},${s.Phone},"${s.Name || ''}","${s.AssignedTo}",${s.LeadBusiness},"${s.Issue}"`);
    }

    fs.writeFileSync('/root/IMA-Campus/backend/cross_business_leads.csv', csvRows.join('\n'));
    console.log(`Found ${suspiciousLeads.length} leads. Exported to cross_business_leads.csv`);
}

main().finally(() => prisma.$disconnect());
