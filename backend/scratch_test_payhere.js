const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPayhereUpdate() {
    const p = await prisma.payment.findFirst({
        where: { status: { in: [0, 2] } },
        orderBy: { id: 'desc' }
    });

    if (!p) {
        console.log("No pending payment found to test.");
        return;
    }

    console.log(`Found pending payment ID: ${p.id}. Status: ${p.status}, Method: ${p.method}`);

    // Call the uploadDueSlip logic directly for testing instead of HTTP request to avoid authentication issues.
    // Or we can just mock req, res for uploadDueSlip.
    const { uploadDueSlip } = require('./controllers/studentController');
    
    let statusCode = 0;
    let jsonResp = null;
    
    const req = {
        body: {
            paymentId: p.id.toString(),
            method: 'payhere',
            remark: 'Test PayHere Online Payment for Due'
        },
        files: [] // no slip images
    };

    const res = {
        status: (code) => {
            statusCode = code;
            return {
                json: (data) => {
                    jsonResp = data;
                }
            };
        }
    };

    await uploadDueSlip(req, res);

    console.log(`API Response Status: ${statusCode}`);
    console.log(`API Response Data:`, jsonResp);

    const updatedP = await prisma.payment.findUnique({ where: { id: p.id } });
    console.log(`Updated Payment in DB -> Status: ${updatedP.status}, Method: ${updatedP.method}`);
}

testPayhereUpdate().finally(() => prisma.$disconnect());
