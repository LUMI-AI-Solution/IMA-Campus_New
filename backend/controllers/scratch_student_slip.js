const fs = require('fs');
let code = fs.readFileSync('/root/IMA-Campus/backend/controllers/studentController.js', 'utf8');

const target2 = `        await prisma.payment.update({
            where: { id: parseInt(paymentId) },
            data: {
                slip_image: slipFileNames,
                method: 'Slip',
                status: 0,
                remark: remark || null
            }
        });`;

const replacement2 = `        const updatedPayment = await prisma.payment.update({
            where: { id: parseInt(paymentId) },
            data: {
                slip_image: slipFileNames,
                method: 'Slip',
                status: 0,
                remark: remark || null
            }
        });

        // 🔥 Sync Lead Enrollment Status with CRM
        try {
            const { syncLeadEnrollment } = require('./paymentController');
            await syncLeadEnrollment(updatedPayment.studentId, updatedPayment.payment_type, updatedPayment);
        } catch (syncErr) {
            console.error("Lead Sync Error on Slip Upload:", syncErr);
        }`;

code = code.replace(target2, replacement2);
fs.writeFileSync('/root/IMA-Campus/backend/controllers/studentController.js', code);
console.log("studentController.js uploadDueSlip updated.");
