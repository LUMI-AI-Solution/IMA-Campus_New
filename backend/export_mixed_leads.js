const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function exportMixedLeads() {
  try {
    const mixedMessages = await prisma.chatMessage.findMany({
      where: {
        leadId: { not: null },
      },
      include: {
        lead: {
          include: {
            business: true,
          }
        },
        whatsappAccount: {
          include: {
            business: true
          }
        }
      }
    });

    const mixedLeadsMap = new Map();

    for (const msg of mixedMessages) {
      if (msg.lead && msg.whatsappAccount) {
        if (msg.lead.businessId !== msg.whatsappAccount.businessId) {
          if (!mixedLeadsMap.has(msg.leadId)) {
            mixedLeadsMap.set(msg.leadId, {
              Lead_ID: msg.lead.id,
              Phone: msg.lead.phone,
              First_Name: msg.lead.firstName || '',
              Last_Name: msg.lead.lastName || '',
              Lead_Actual_Business: msg.lead.business?.name || 'Unknown',
              Mixed_Message_From_Business: msg.whatsappAccount.business?.name || 'Unknown'
            });
          }
        }
      }
    }

    const leads = Array.from(mixedLeadsMap.values());
    console.log(`Found ${leads.length} mixed leads. Exporting...`);

    if (leads.length > 0) {
      const headers = Object.keys(leads[0]).join(',');
      const rows = leads.map(lead => Object.values(lead).map(v => `"${v}"`).join(','));
      const csv = [headers, ...rows].join('\n');
      
      fs.writeFileSync('/root/IMA-Campus/backend/mixed_leads_export.csv', csv);
      console.log('Successfully exported to /root/IMA-Campus/backend/mixed_leads_export.csv');
    }
    
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

exportMixedLeads();
