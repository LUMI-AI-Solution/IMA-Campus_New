const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const prisma = new PrismaClient();

async function testNewInq() {
    console.log("Creating dummy lead...");
    const dummyPhone = `+9470${Math.floor(1000000 + Math.random() * 9000000)}`;
    
    // First let's check if newInqPhase exists in Lead model
    const leadMeta = PrismaClient.dmmf ? PrismaClient.dmmf.datamodel.models.find(m => m.name === 'Lead') : null;
    if(leadMeta) {
        const fields = leadMeta.fields.map(f => f.name);
        console.log("Lead fields:", fields);
    }
    
    let lead;
    try {
        lead = await prisma.lead.create({
            data: {
                name: "Test Dummy Lead",
                phone: dummyPhone,
                campaignType: "AFTER_SEMINAR",
                status: "NEW",
                source: "whatsapp",
                assignedTo: 1
            }
        });
        console.log("Dummy Lead created:", lead.id);
    } catch(err) {
        console.error("Failed to create dummy lead:", err.message);
        return;
    }

    try {
        console.log("Sending API request to updateCallCampaign for New Inquiry...");
        const res = await axios.post('http://localhost:5000/api/after-seminar-crm/leads/bulk-action', {
            action: 'CHANGE_ROUND',
            leadIds: [lead.id],
            targetRound: 2
        });
        console.log("✅ API Success:", res.data);

        // Check Lead progress
        const progress = await prisma.leadRoundProgress.findMany({
            where: { leadId: lead.id }
        });
        console.log("LeadRoundProgress after push:", progress);
        
    } catch (e) {
        console.error("❌ API Error:");
        if (e.response) {
            console.error("Status:", e.response.status);
            console.error("Data:", e.response.data);
        } else {
            console.error(e.message);
        }
    } finally {
        if(lead) {
            console.log("Cleaning up dummy lead...");
            await prisma.lead.delete({ where: { id: lead.id } });
            console.log("Cleanup done.");
        }
    }
}

testNewInq().catch(console.error).finally(() => prisma.$disconnect());
