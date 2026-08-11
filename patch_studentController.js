const fs = require('fs');

let content = fs.readFileSync('/root/IMA-Campus/backend/controllers/studentController.js', 'utf-8');

const anchor = `
        pendingPayments.forEach(p => {
            if (p.due_date && (p.method !== 'Slip' || p.status === 2 || p.status === 5)) {
`;

const upcomingLogic = `
        // -- PROACTIVE UPCOMING MONTHLY PAYMENTS LOGIC --
        // Check if today is >= 24th of the month
        if (today.getDate() >= 24) {
            // Find valid monthly payments for this student
            const validMonthly = await prisma.payment.findMany({
                where: { studentId: parseInt(studentId), status: { in: [0, 1, 4] }, payment_type: 1 },
                include: { group: true, batch: { include: { business: true } } }
            });
            
            const batchMap = {};
            validMonthly.forEach(p => {
                if (!p.batchId || !p.group) return;
                if (!batchMap[p.batchId]) {
                    batchMap[p.batchId] = { batch: p.batch, highestGroup: p.group, subjects: p.subjects };
                } else {
                    if (p.group.itemOrder > batchMap[p.batchId].highestGroup.itemOrder) {
                        batchMap[p.batchId].highestGroup = p.group;
                        batchMap[p.batchId].subjects = p.subjects;
                    }
                }
            });

            for (let batchId in batchMap) {
                const { batch, highestGroup, subjects } = batchMap[batchId];
                
                // Find next group
                const nextGroup = await prisma.group.findFirst({
                    where: {
                        batchId: parseInt(batchId),
                        type: 1, // assuming monthly groups are type 1
                        itemOrder: { gt: highestGroup.itemOrder }
                    },
                    orderBy: { itemOrder: 'asc' }
                });

                if (nextGroup) {
                    // Check if user already has a pending/completed payment for this group
                    const existingPayment = await prisma.payment.findFirst({
                        where: {
                            studentId: parseInt(studentId),
                            batchId: parseInt(batchId),
                            groupId: nextGroup.id,
                            status: { not: 3 } // not rejected
                        }
                    });

                    if (!existingPayment) {
                        let amount = 0;
                        let parsedSubjects = [];
                        try { parsedSubjects = subjects ? JSON.parse(subjects) : []; } catch(e) {}
                        
                        if (batch.paidMonthlyPerSubject) {
                            let parsedMap = {};
                            try { parsedMap = JSON.parse(batch.paidMonthlyPerSubject); } catch(e) {}
                            parsedSubjects.forEach(subId => {
                                amount += (parsedMap[subId] || 0);
                            });
                        } else {
                            amount = batch.totalPaidMonthly || 0;
                        }

                        // Push a virtual payment
                        const courseName = \`\${batch.business?.name || ''} - \${batch.name || ''}\`;
                        const nextMonthDueDate = new Date(today.getFullYear(), today.getMonth() + 1, 5); // 5th of next month

                        duePaymentsList.push({
                            id: \`virtual_\${nextGroup.id}\`,
                            isUpcomingMonthly: true,
                            groupId: nextGroup.id,
                            batchId: batch.id,
                            businessId: batch.businessId,
                            subjects: subjects, // raw JSON string
                            courseName: courseName,
                            amount: amount,
                            dueDate: nextMonthDueDate,
                            isInstallment: false,
                            diffDays: Math.ceil((nextMonthDueDate - today) / (1000 * 60 * 60 * 24)),
                            nextGroupName: nextGroup.name
                        });
                    }
                }
            }
        }
        // ------------------------------------------------

        pendingPayments.forEach(p => {
            if (p.due_date && (p.method !== 'Slip' || p.status === 2 || p.status === 5)) {
`;

if(content.includes('PROACTIVE UPCOMING MONTHLY PAYMENTS LOGIC')) {
  console.log("Already patched dashboard");
} else {
  content = content.replace(anchor, upcomingLogic);
}

// Do the same for my-payments logic? Wait, dashboard endpoint is one thing.
// What about getMyPayments?
const myPaymentsAnchor = `
        const [payments, stats] = await Promise.all([
            prisma.payment.findMany({
`;
// Actually, PaymentScreen uses getMyPayments? No, it uses /mobile/my-payments.
// Let's check where that is.

fs.writeFileSync('/root/IMA-Campus/backend/controllers/studentController.js', content);
console.log("Done");
