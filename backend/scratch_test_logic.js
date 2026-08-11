const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const axios = require('axios');

async function test() {
    const existingLead = await prisma.lead.findUnique({ where: { id: 44340 } });
    const settings = await prisma.crmSettings.findFirst({
        where: { businessId: 6, campaignType: 'FREE_SEMINAR' }
    });
    
    const autoReplies = await prisma.autoReply.findMany({ 
        where: { campaignType: 'FREE_SEMINAR', businessId: settings.businessId }, 
        orderBy: { stepOrder: 'asc' } 
    });
    
    console.log("existingLead sequenceCompleted:", existingLead.sequenceCompleted);
    console.log("autoReplies length:", autoReplies.length);
    
    if (autoReplies.length > 0) {
        const currentStep = existingLead.autoReplyStep || 0;
        const futureReplies = autoReplies.filter(r => r.stepOrder > currentStep);
        console.log("futureReplies length:", futureReplies.length);
        
        if (futureReplies.length > 0) {
            const targetStep = futureReplies[0].stepOrder;
            console.log("targetStep:", targetStep);
            const possibleReplies = futureReplies.filter(r => r.stepOrder === targetStep);
            const nextReply = possibleReplies[0];
            
            console.log("nextReply:", nextReply.message);
        }
    }
}
test().finally(() => prisma.$disconnect());
