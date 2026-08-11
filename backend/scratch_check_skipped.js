const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const businessId = 1; 
    const batchId = 1; 

    // Find the batch for "2027 MAY Intake - කලා අංශය"
    const batch = await prisma.batch.findFirst({
        where: { name: { contains: '2027 MAY Intake - කලා අංශය' } }
    });
    
    if (!batch) { console.log("Batch not found"); return; }
    console.log("Batch ID:", batch.id);

    // Get Midu's user ID
    const miduUser = await prisma.user.findFirst({
        where: { firstName: { contains: 'Midu' } }
    });
    if (!miduUser) { console.log("Midu not found"); return; }

    const leads = await prisma.lead.findMany({
        where: { batchId: batch.id, campaignType: 'AFTER_SEMINAR', assignedTo: miduUser.id }
    });
    
    console.log(`Midu has ${leads.length} leads in AFTER_SEMINAR for this batch.`);

    const payments = await prisma.payment.findMany({
        where: { batchId: batch.id, status: { in: [0, 1, 4] } },
        include: { student: { select: { phone: true, whatsapp: true } } }
    });

    let monthlyCount = 0;
    let joinedAfterMay = 0;
    let skippedByNoPayment = 0;
    
    // Group payments by student
    const studentPaymentsMap = {};
    payments.forEach(p => {
        if (!p.student) return;
        const normPhone = (p.student.whatsapp || p.student.phone || '').replace(/[^0-9]/g, '').slice(-9);
        if (!studentPaymentsMap[normPhone]) studentPaymentsMap[normPhone] = [];
        studentPaymentsMap[normPhone].push(p);
    });

    leads.forEach(l => {
        const leadPhone = l.phone.split('_')[0].replace(/[^0-9]/g, '').slice(-9);
        const stuPayments = studentPaymentsMap[leadPhone] || [];
        
        if (stuPayments.length === 0) {
            skippedByNoPayment++;
            return;
        }

        // Check if any payment is Monthly (type 1)
        const hasMonthly = stuPayments.some(p => p.payment_type === 1);
        if (hasMonthly) {
            monthlyCount++;

            // Find earliest payment date
            let earliestDate = null;
            stuPayments.forEach(p => {
                if (!earliestDate || new Date(p.created_at) < earliestDate) {
                    earliestDate = new Date(p.created_at);
                }
            });

            if (earliestDate) {
                const joinMonth = earliestDate.toLocaleString('default', { month: 'long' }).toUpperCase();
                // Assuming May is index 4 in zero-indexed, let's just check if it's AFTER May.
                // May is the start month of the batch.
                if (earliestDate.getMonth() > 4) { // 0=Jan, 4=May. >4 means June, July, etc.
                    joinedAfterMay++;
                }
            }
        }
    });

    console.log(`Of Midu's leads, ${skippedByNoPayment} have NO payments.`);
    console.log(`Of the ones with payments, ${monthlyCount} have Monthly payments.`);
    console.log(`Of those Monthly, ${joinedAfterMay} joined AFTER May.`);
}
run().catch(console.error).finally(() => prisma.$disconnect());
