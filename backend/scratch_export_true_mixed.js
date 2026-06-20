const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
    const msgs = await prisma.chatMessage.findMany({
        where: { senderName: 'AutoBot' },
        include: { 
            lead: { 
                include: { 
                    assignedUser: true,
                    batch: {
                        include: { business: true }
                    }
                } 
            } 
        }
    });

    const crossLeads = new Map();

    for (const msg of msgs) {
        if (!msg.message || !msg.lead || !msg.lead.phone) continue;
        
        // Find the business ID of the lead
        let leadBizId = null;
        let leadBizName = 'Unknown';
        
        if (msg.lead.batch && msg.lead.batch.business) {
            leadBizId = msg.lead.batch.business.id;
            leadBizName = msg.lead.batch.business.name;
        } else {
            // Try to extract from phone
            const match = msg.lead.phone.match(/_BIZ_(\d+)/);
            if (match) {
                leadBizId = parseInt(match[1]);
            }
        }

        if (leadBizId === null) continue;

        let hasCross = false;
        let issue = '';

        // Check if the auto-reply doesn't match the lead's business
        if (msg.message.includes('කලා / වාණිජ')) {
            // Art = 1, Commerce = 6
            if (leadBizId !== 1 && leadBizId !== 6) {
                hasCross = true;
                issue = 'Got Art/Commerce AutoReply but is in ' + leadBizName;
            }
        } else if (msg.message.includes('ටක් ගාලා ටෙක් කරමු')) {
            // Tech = 4, Tech Old = 11
            if (leadBizId !== 4 && leadBizId !== 11) {
                hasCross = true;
                issue = 'Got Tech AutoReply but is in ' + leadBizName;
            }
        }

        if (hasCross) {
            crossLeads.set(msg.lead.id, {
                ID: msg.lead.id,
                Phone: msg.lead.phone,
                Name: `${msg.lead.firstName || ''} ${msg.lead.lastName || ''}`.trim(),
                AssignedTo: msg.lead.assignedUser ? `${msg.lead.assignedUser.firstName} ${msg.lead.assignedUser.lastName}` : 'Unassigned',
                LeadBusinessName: leadBizName,
                Issue: issue
            });
        }
    }

    const suspiciousLeads = Array.from(crossLeads.values());
    const csvRows = ['ID,Phone,Name,AssignedTo,LeadBusinessName,Issue'];
    for (const s of suspiciousLeads) {
        csvRows.push(`${s.ID},${s.Phone},"${s.Name}","${s.AssignedTo}","${s.LeadBusinessName}","${s.Issue}"`);
    }

    fs.writeFileSync('/root/IMA-Campus/backend/true_mixed_leads.csv', csvRows.join('\n'));
    console.log(`Found ${suspiciousLeads.length} truly mixed leads. Exported to true_mixed_leads.csv`);
}

main().finally(() => prisma.$disconnect());
