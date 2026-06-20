const fs = require('fs');
let code = fs.readFileSync('/root/IMA-Campus/backend/controllers/studentController.js', 'utf8');

const target3 = `        // update the payment as paid via PayHere
        const updatedPayment = await prisma.payment.update({
            where: { id: parseInt(paymentId) },
            data: {
                status: 1,
                method: 'PayHere',
                remark: payment.remark ? \`\${payment.remark} | Online Pay ID: \${orderId || 'Direct'}\` : \`Online Pay ID: \${orderId || 'Direct'}\`
            }
        });`;

const replacement3 = `        // update the payment as paid via PayHere
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
        }`;

code = code.replace(target3, replacement3);
fs.writeFileSync('/root/IMA-Campus/backend/controllers/studentController.js', code);
console.log("studentController.js payDueOnline updated.");
