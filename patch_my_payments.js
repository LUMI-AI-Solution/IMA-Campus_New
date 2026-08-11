const fs = require('fs');
let content = fs.readFileSync('/root/IMA-Campus/backend/controllers/studentController.js', 'utf-8');

const anchor = `
        const safeData = safeJson({
            oldPayments: formattedPayments,
`;

const patch = `
        // -- PROACTIVE UPCOMING MONTHLY PAYMENTS LOGIC FOR MY PAYMENTS --
        const today = new Date();
        if (today.getDate() >= 24) {
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
                
                const nextGroup = await prisma.group.findFirst({
                    where: {
                        batchId: parseInt(batchId),
                        type: 1, 
                        itemOrder: { gt: highestGroup.itemOrder }
                    },
                    orderBy: { itemOrder: 'asc' }
                });

                if (nextGroup) {
                    const existingPayment = await prisma.payment.findFirst({
                        where: {
                            studentId: parseInt(studentId),
                            batchId: parseInt(batchId),
                            groupId: nextGroup.id,
                            status: { not: 3 }
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

                        const nextMonthDueDate = new Date(today.getFullYear(), today.getMonth() + 1, 5);
                        
                        // Push into formattedPayments
                        formattedPayments.push({
                            id: \`virtual_\${nextGroup.id}\`,
                            courseName: \`\${batch.business?.name || 'Course'} - \${batch.name || 'Batch'} - \${nextGroup.name}\`,
                            groupName: nextGroup.name,
                            groupId: nextGroup.id,
                            batchId: batch.id,
                            businessId: batch.businessId,
                            subjects: subjects,
                            slips: [],
                            amount: amount, 
                            status: 0, // Pending/Due
                            createdDate: nextMonthDueDate,
                            dueDate: nextMonthDueDate,
                            isInstallment: false,
                            method: 'Upcoming',
                            isUpcomingMonthly: true
                        });
                    }
                }
            }
        }
        // ------------------------------------------------

        const safeData = safeJson({
            oldPayments: formattedPayments,
`;

if(content.includes('PROACTIVE UPCOMING MONTHLY PAYMENTS LOGIC FOR MY PAYMENTS')) {
  console.log("Already patched my-payments");
} else {
  content = content.replace(anchor, patch);
  fs.writeFileSync('/root/IMA-Campus/backend/controllers/studentController.js', content);
  console.log("Done");
}
