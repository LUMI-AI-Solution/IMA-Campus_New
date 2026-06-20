const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
    // Get all auto-replies to map distinct keywords to business IDs
    const autoReplies = await prisma.autoReply.findMany();
    const keywords = [];
    
    // Create some unique snippets for each auto-reply to identify them
    for (const ar of autoReplies) {
        if (!ar.message) continue;
        const snippet = ar.message.substring(0, 30).replace(/\n/g, ' ').trim();
        if (snippet.length > 10) {
            keywords.push({ businessId: ar.businessId, keyword: snippet });
        }
    }

    const allLeads = await prisma.lead.findMany({
        where: { campaignType: 'AFTER_SEMINAR' },
        include: {
            messages: {
                where: { senderName: 'AutoBot' }
            },
            assignedUser: true
        }
    });

    let suspiciousLeads = [];

    for (const lead of allLeads) {
        if (!lead.phone) continue;
        const match = lead.phone.match(/_BIZ_(\d+)/);
        if (!match) continue;
        const leadBizId = parseInt(match[1]);

        let crossMessages = [];
        for (const msg of lead.messages) {
            if (!msg.message) continue;
            for (const kw of keywords) {
                if (msg.message.includes(kw.keyword) && kw.businessId !== leadBizId) {
                    crossMessages.push(`Got Biz ${kw.businessId} msg`);
                }
            }
        }

        if (crossMessages.length > 0) {
            suspiciousLeads.push({
                ID: lead.id,
                Phone: lead.phone,
                Name: lead.name,
                AssignedTo: lead.assignedUser ? `${lead.assignedUser.firstName} ${lead.assignedUser.lastName}` : 'Unassigned',
                LeadBusiness: leadBizId,
                Issue: [...new Set(crossMessages)].join(', ')
            });
        }
    }

    const csvRows = ['ID,Phone,Name,AssignedTo,LeadBusiness,Issue'];
    for (const s of suspiciousLeads) {
        csvRows.push(`${s.ID},${s.Phone},"${s.Name || ''}","${s.AssignedTo}",${s.LeadBusiness},"${s.Issue}"`);
    }

    fs.writeFileSync('/root/IMA-Campus/backend/cross_business_leads.csv', csvRows.join('\n'));
    console.log(`Found ${suspiciousLeads.length} leads. Exported to /root/IMA-Campus/backend/cross_business_leads.csv`);
}

main().finally(() => prisma.$disconnect());
