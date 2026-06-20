const fs = require('fs');
let code = fs.readFileSync('/root/IMA-Campus/backend/controllers/studentController.js', 'utf8');

const target = `        const newPayment = await prisma.payment.create({
            data: {
                studentId: parseInt(studentId),
                businessId: parseInt(businessId),
                batchId: parseInt(batchId),
                groupId: groupId ? parseInt(groupId) : null,
                subjects: typeof subjects === 'string' ? subjects : JSON.stringify(subjects || []),
                payment_type: parsedPaymentType,
                method: safeMethod === 'slip' ? 'Slip' : 'PayHere',
                status: initialStatus,
                slip_image: slipFileNames,
                amount: amount ? parseFloat(parseFloat(amount).toFixed(2)) : 0,
                remark: remark || null
            }
        });`;

const replacement = `        const newPayment = await prisma.payment.create({
            data: {
                studentId: parseInt(studentId),
                businessId: parseInt(businessId),
                batchId: parseInt(batchId),
                groupId: groupId ? parseInt(groupId) : null,
                subjects: typeof subjects === 'string' ? subjects : JSON.stringify(subjects || []),
                payment_type: parsedPaymentType,
                method: safeMethod === 'slip' ? 'Slip' : 'PayHere',
                status: initialStatus,
                slip_image: slipFileNames,
                amount: amount ? parseFloat(parseFloat(amount).toFixed(2)) : 0,
                remark: remark || null
            }
        });

        // 🔥 Sync Lead Enrollment Status with CRM
        try {
            const { syncLeadEnrollment } = require('./paymentController');
            await syncLeadEnrollment(newPayment.studentId, newPayment.payment_type, newPayment);
        } catch (syncErr) {
            console.error("Lead Sync Error on Enroll:", syncErr);
        }`;

code = code.replace(target, replacement);

fs.writeFileSync('/root/IMA-Campus/backend/controllers/studentController.js', code);
console.log("studentController.js updated.");
