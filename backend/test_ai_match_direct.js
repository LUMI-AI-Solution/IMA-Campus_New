const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const aiVerificationController = require('./controllers/aiVerificationController');

async function testMatch() {
    try {
        // Find the payment with amount 2200
        const payment = await prisma.payment.findFirst({
            where: { amount: 2200 },
            orderBy: { id: 'desc' }
        });
        
        if (!payment) {
            console.log("Payment not found");
            return;
        }

        console.log("Testing with Payment ID:", payment.id);

        const req = {
            body: {
                paymentId: 2362,
                statementMonth: 'TEST',
                autoDetect: false,
                overrideBank: 'Commercial',
                overrideSlip: 'CDM Slip'
            }
        };

        const res = {
            status: function(code) {
                return {
                    json: function(data) {
                        console.log(`Response Status: ${code}`);
                        console.log("Response Data:", JSON.stringify(data, null, 2));
                    }
                };
            }
        };

        await aiVerificationController.verifySinglePayment(req, res);
    } catch(err) {
        console.error("Error:", err);
    }
}

testMatch();
