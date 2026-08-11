const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const businessId = 1; // Assuming businessId 1 from screenshot (Art)
    const batchId = 1; // We'll find the exact batchId for '2027 MAY Intake - කලා අංශය'

    const batch = await prisma.batch.findFirst({
        where: { name: { contains: '2027 MAY Intake' } }
    });
    
    if (!batch) { console.log("Batch not found"); return; }
    
    console.log("Batch ID:", batch.id);

    // 1. MATRIX LOGIC
    const payments = await prisma.payment.findMany({
        where: { batchId: batch.id, status: 1 },
        include: { student: { select: { id: true, firstName: true, phone: true, whatsapp: true } } }
    });

    const leadsMatrix = await prisma.lead.findMany({
        where: { campaignType: 'AFTER_SEMINAR', phone: { contains: `BIZ_` } },
        include: { assignedUser: { select: { firstName: true } } }
    });

    let matrixMonthlyCount = 0;
    let miduMatrixCount = 0;
    const studentMap = {};

    payments.forEach(p => {
        if (!p.student) return;
        const stuId = p.student.id;
        if (!studentMap[stuId]) {
            const normPhone = (p.student.whatsapp || p.student.phone || '').replace(/[^0-9]/g, '').slice(-9);
            const matchingLead = leadsMatrix.find(l => {
                const leadPhoneBase = l.phone.split('_')[0].replace(/[^0-9]/g, '');
                return leadPhoneBase === normPhone;
            });
            let coord = 'Unassigned';
            if (matchingLead && matchingLead.assignedUser) {
                coord = matchingLead.assignedUser.firstName;
            }
            studentMap[stuId] = { paymentTypes: new Set(), coordinator: coord };
        }
        if (p.payment_type === 1) studentMap[stuId].paymentTypes.add('Monthly');
        if (p.payment_type === 3) studentMap[stuId].paymentTypes.add('Full');
    });

    Object.values(studentMap).forEach(s => {
        let type = 'Unknown';
        if (s.paymentTypes.has('Full') && s.paymentTypes.has('Monthly')) type = 'Hybrid';
        else if (s.paymentTypes.has('Full')) type = 'Full';
        else if (s.paymentTypes.has('Monthly')) type = 'Monthly';
        
        if (type === 'Monthly') {
            matrixMonthlyCount++;
            if (s.coordinator && s.coordinator.includes('Midu')) miduMatrixCount++;
        }
    });

    console.log(`MATRIX: Total Monthly: ${matrixMonthlyCount}, Midu Monthly: ${miduMatrixCount}`);

    // Let's just output this for now to see the numbers
}
run().catch(console.error).finally(() => prisma.$disconnect());
