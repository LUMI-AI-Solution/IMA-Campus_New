const fs = require('fs');
let code = fs.readFileSync('/root/IMA-Campus/backend/controllers/studentController.js', 'utf8');

const newFunction = `
// 🔥 FIXED: Pay Due Online
exports.payDueOnline = async (req, res) => {
    try {
        const { paymentId, orderId } = req.body;
        const studentId = req.user?.userId || req.user?.id;

        if (!studentId) return res.status(401).json({ error: "Unauthorized" });

        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        const payment = await prisma.payment.findFirst({
            where: { id: parseInt(paymentId), studentId: studentId.toString() }
        });

        if (!payment) return res.status(404).json({ error: "Payment not found" });

        // update the payment as paid via PayHere
        const updatedPayment = await prisma.payment.update({
            where: { id: parseInt(paymentId) },
            data: {
                status: 1,
                method: 'PayHere',
                remark: payment.remark ? \`\${payment.remark} | Online Pay ID: \${orderId || 'Direct'}\` : \`Online Pay ID: \${orderId || 'Direct'}\`
            }
        });

        // 🔥 Sync Lead Enrollment Status with CRM
        try {
            const { syncLeadEnrollment } = require('./paymentController');
            await syncLeadEnrollment(updatedPayment.studentId, updatedPayment.payment_type, updatedPayment);
        } catch (syncErr) {
            console.error("Lead Sync Error on Online Pay:", syncErr);
        }

        res.status(200).json({ message: "Payment updated successfully" });
    } catch (error) {
        console.error("Pay Due Online Error:", error);
        res.status(500).json({ error: "Failed to update payment" });
    }
};

`;

code = code.replace("exports.deleteStudentAccount", newFunction + "exports.deleteStudentAccount");

fs.writeFileSync('/root/IMA-Campus/backend/controllers/studentController.js', code);
console.log("studentController.js fixed!");
