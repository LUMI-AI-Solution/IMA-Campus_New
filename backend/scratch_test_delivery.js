const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const paymentController = require('./controllers/paymentController');

async function test() {
    const studentId = 1;
    const bizId = 1;
    const batchId = 5;
    const mayGroupId = 12;
    const juneGroupId = 19;
    const subjects = '[33]';

    const makeReqRes = (body) => {
        const req = {
            user: { userId: 1, role: 'SYSTEM_ADMIN' },
            body: body
        };
        const res = {
            statusVal: 200,
            jsonVal: null,
            status: function(s) { this.statusVal = s; return this; },
            json: function(j) { this.jsonVal = j; return this; }
        };
        return { req, res };
    };

    console.log("--- Starting Test ---");

    const mayPay1 = await prisma.payment.create({
        data: { studentId, businessId: bizId, batchId, groupId: mayGroupId, subjects, payment_type: 1, method: 'Slip', status: 0, amount: 1000 }
    });
    console.log("Created May Payment ID:", mayPay1.id);
    let { req, res } = makeReqRes({ paymentId: mayPay1.id, action: 'Approve' });
    await paymentController.paymentAction(req, res);
    let dels = await prisma.delivery.findMany({ where: { studentId: String(studentId), paymentId: mayPay1.id } });
    console.log("👉 Deliveries after May Pay 1:", dels.length, "(Expected: 1)");

    const mayPay2 = await prisma.payment.create({
        data: { studentId, businessId: bizId, batchId, groupId: mayGroupId, subjects, payment_type: 1, method: 'Slip', status: 0, amount: 1000 }
    });
    ({ req, res } = makeReqRes({ paymentId: mayPay2.id, action: 'Approve' }));
    await paymentController.paymentAction(req, res);
    dels = await prisma.delivery.findMany({ where: { studentId: String(studentId), paymentId: mayPay2.id } });
    console.log("👉 Deliveries after Duplicate May Pay 2:", dels.length, "(Expected: 0)");

    const junePay = await prisma.payment.create({
        data: { studentId, businessId: bizId, batchId, groupId: juneGroupId, subjects, payment_type: 1, method: 'Slip', status: 0, amount: 1000 }
    });
    ({ req, res } = makeReqRes({ paymentId: junePay.id, action: 'Approve' }));
    await paymentController.paymentAction(req, res);
    dels = await prisma.delivery.findMany({ where: { studentId: String(studentId), paymentId: junePay.id } });
    console.log("👉 Deliveries after June Pay:", dels.length, "(Expected: 1)");

    const fullPay1 = await prisma.payment.create({
        data: { studentId, businessId: bizId, batchId, groupId: null, subjects, payment_type: 3, method: 'Slip', status: 0, amount: 5000, remark: '[UPGRADE]' }
    });
    ({ req, res } = makeReqRes({ paymentId: fullPay1.id, action: 'Approve' }));
    await paymentController.paymentAction(req, res);
    dels = await prisma.delivery.findMany({ where: { studentId: String(studentId), paymentId: fullPay1.id } });
    console.log("👉 Deliveries after Full Pay 1:", dels.length, "(Expected: 1)");

    const fullPay2 = await prisma.payment.create({
        data: { studentId, businessId: bizId, batchId, groupId: null, subjects, payment_type: 3, method: 'Slip', status: 0, amount: 5000, remark: '[UPGRADE]' }
    });
    ({ req, res } = makeReqRes({ paymentId: fullPay2.id, action: 'Approve' }));
    await paymentController.paymentAction(req, res);
    dels = await prisma.delivery.findMany({ where: { studentId: String(studentId), paymentId: fullPay2.id } });
    console.log("👉 Deliveries after Duplicate Full Pay 2:", dels.length, "(Expected: 0)");

    await prisma.deliveryItem.deleteMany({
        where: { delivery: { paymentId: { in: [mayPay1.id, mayPay2.id, junePay.id, fullPay1.id, fullPay2.id] } } }
    });
    await prisma.delivery.deleteMany({
        where: { paymentId: { in: [mayPay1.id, mayPay2.id, junePay.id, fullPay1.id, fullPay2.id] } }
    });
    await prisma.payment.deleteMany({
        where: { id: { in: [mayPay1.id, mayPay2.id, junePay.id, fullPay1.id, fullPay2.id] } }
    });
    
    console.log("--- Test Finished and Cleaned Up! ---");
}

test().catch(console.error).finally(() => prisma.$disconnect());
