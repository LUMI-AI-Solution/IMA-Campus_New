const fs = require('fs');
let code = fs.readFileSync('/root/IMA-Campus/backend/controllers/paymentController.js', 'utf8');

const regex = /(let pIntention = 'MONTHLY';[\s\S]*?if \(leads\.length > 0\) {)/;

const newBlock = `let pIntention = 'MONTHLY';
        const pType = parseInt(paymentType);
        if (pType === 3) pIntention = 'FULL';
        else if (pType === 2) pIntention = 'INSTALLMENT';

        let newEnrollmentStatus = 'NON_ENROLLED';
        if (payment && payment.status === 1) newEnrollmentStatus = 'ENROLLED';
        else if (payment && (payment.status === 0 || payment.status === 4)) newEnrollmentStatus = 'PAYMENT_PROCESSING';
        else if (payment && (payment.status === 2 || payment.status === 5)) newEnrollmentStatus = 'NON_ENROLLED';

        if (leads.length > 0) {`;

code = code.replace(regex, newBlock);
code = code.replace(/enrollmentStatus: 'ENROLLED'/g, 'enrollmentStatus: newEnrollmentStatus');

fs.writeFileSync('/root/IMA-Campus/backend/controllers/paymentController.js', code);
console.log("Replaced successfully!");
