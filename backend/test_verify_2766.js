const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { verifySlip } = require('./controllers/aiVerificationController');

async function test() {
    const payment = await prisma.payment.findUnique({
        where: { id: 2766 },
        include: { user: true, PaymentImage: true, batch: true }
    });
    
    if (!payment) {
        console.log("Payment not found");
        return;
    }
    
    console.log("Found Payment:", payment.id);
    
    // Simulate the verifySlip call manually or just call the controller logic.
    // Actually, verifySlip expects a req, res object.
}
test();
