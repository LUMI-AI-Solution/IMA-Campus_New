const { PrismaClient } = require('@prisma/client');
const controller = require('./controllers/afterSeminarInquiryController');
const prisma = new PrismaClient();

async function test() {
    const lead = await prisma.lead.findFirst({
        where: { campaignType: 'AFTER_SEMINAR' },
        orderBy: { id: 'desc' }
    });
    console.log("Testing with lead ID:", lead.id, "phone:", lead.phone);

    const req = { body: { leadId: lead.id } };
    const res = {
        status: (code) => {
            console.log("Status:", code);
            return {
                json: (data) => console.log("Response:", data)
            };
        }
    };
    
    await controller.sendCallPermissionRequest(req, res);
}
test();
