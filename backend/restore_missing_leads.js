const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getLast9Digits = (phone) => {
    if (!phone) return '';
    const basePhone = String(phone).split('_')[0];
    const cleaned = basePhone.replace(/[^0-9]/g, '');
    return cleaned.slice(-9);
};

// Coordinator mappings per business (Only actual Call Coordinators, NO Managers)
const businessCoordinators = {
    1: [4422, 49, 48, 347, 3745, 35], // Art
    4: [29, 28, 54, 3570],            // Tech (Niluka: 29, Vishaka: 28, Gavini: 54, Chanya: 3570)
    6: [31, 32, 46],                  // Commerce (Hansi: 31, Nishadi: 32, Dinithi: 46)
    9: [799, 800, 803, 853, 3790],    // O/L
    10: [3722, 3723],                 // English
    13: [928, 950, 3544, 2446],       // Online School
    14: [116, 1497, 3627],            // FAST TRACK
    16: [3887],                       // Media
    17: [3908],                       // 2 Year Arts
    18: [4123, 3722, 3723],           // Law
    19: [3722, 3723]                  // 5 to 5
};

async function restoreMissingLeads() {
    console.log("🚀 Starting missing lead restoration...");

    const allPayments = await prisma.payment.findMany({
        where: { status: { in: [0, 1, 4] } },
        include: { student: true, business: true, batch: true }
    });

    const allLeads = await prisma.lead.findMany({
        select: {
            id: true,
            phone: true,
            campaignType: true,
            batchId: true,
            assignedTo: true,
            batch: { select: { id: true, businessId: true } }
        }
    });

    const leadsByLast9 = new Map();
    allLeads.forEach(l => {
        const last9 = getLast9Digits(l.phone);
        if (!last9) return;
        if (!leadsByLast9.has(last9)) leadsByLast9.set(last9, []);
        leadsByLast9.get(last9).push(l);
    });

    const bizStudentMap = new Map();
    allPayments.forEach(p => {
        if (!p.student) return;
        const p1 = getLast9Digits(p.student.phone) || getLast9Digits(p.student.whatsapp) || getLast9Digits(p.student.optionalPhone);
        if (!p1) return;
        const key = `${p.businessId}_${p1}`;
        if (!bizStudentMap.has(key)) {
            bizStudentMap.set(key, {
                businessId: p.businessId,
                businessName: p.business?.name,
                batchId: p.batchId,
                batchName: p.batch?.name,
                phoneSuffix: p1,
                student: p.student,
                payments: [p]
            });
        } else {
            bizStudentMap.get(key).payments.push(p);
        }
    });

    let createdCount = 0;
    const coordinatorRRIndex = {};

    for (const [key, item] of bizStudentMap.entries()) {
        const matchingLeads = leadsByLast9.get(item.phoneSuffix) || [];
        const bizLead = matchingLeads.find(l => {
            const phoneMatchesBiz = l.phone && (
                l.phone.includes(`_BIZ_${item.businessId}`) ||
                l.phone.includes(`_BIZ_${item.businessId}_AS`) ||
                l.phone.includes(`_BIZ_${item.businessId}_BATCH_`)
            );
            const batchMatchesBiz = l.batch?.businessId === item.businessId;
            return phoneMatchesBiz || batchMatchesBiz;
        });

        if (!bizLead) {
            // Recreate this lead in its correct business!
            const studentName = `${item.student.firstName} ${item.student.lastName || ''}`.trim();
            const phoneKey = `94${item.phoneSuffix}_BIZ_${item.businessId}_AS`;

            // Determine payment intention
            let pIntention = 'MONTHLY';
            if (item.payments.some(p => p.payment_type === 3)) pIntention = 'FULL';
            else if (item.payments.some(p => p.payment_type === 2)) pIntention = 'INSTALLMENT';

            // Determine coordinator assignment
            let assignedCoordinatorId = null;
            if (item.businessId === 4 && item.batchId === 38) {
                // For Batch 38 Tech, assign to Niluka (29) to restore her 51 leads
                assignedCoordinatorId = 29;
            } else {
                // Check if any coordinator worked on another lead of this student
                const existingAssigned = matchingLeads.find(l => l.assignedTo != null)?.assignedTo;
                const pool = businessCoordinators[item.businessId] || [];
                if (existingAssigned && pool.includes(existingAssigned)) {
                    assignedCoordinatorId = existingAssigned;
                } else if (pool.length > 0) {
                    if (!coordinatorRRIndex[item.businessId]) coordinatorRRIndex[item.businessId] = 0;
                    assignedCoordinatorId = pool[coordinatorRRIndex[item.businessId] % pool.length];
                    coordinatorRRIndex[item.businessId]++;
                }
            }

            try {
                // Check if lead with this exact phone already exists
                const existingByPhone = await prisma.lead.findUnique({
                    where: { phone: phoneKey }
                });

                if (!existingByPhone) {
                    await prisma.lead.create({
                        data: {
                            name: studentName,
                            phone: phoneKey,
                            source: 'whatsapp',
                            campaignType: 'AFTER_SEMINAR',
                            status: 'OPEN',
                            batchId: item.batchId,
                            assignedTo: assignedCoordinatorId,
                            enrollmentStatus: 'ENROLLED',
                            paymentIntention: pIntention,
                            phase: 1,
                            callStatus: 'pending',
                            paidPhase: 1,
                            paidCallStatus: 'pending',
                            paidRound: 1,
                            inquiryType: 'NORMAL'
                        }
                    });
                    createdCount++;
                    console.log(`✅ Restored lead for ${studentName} (${item.phoneSuffix}) in Biz ${item.businessId} (Batch ${item.batchId}) -> AssignedTo: ${assignedCoordinatorId}`);
                }
            } catch (err) {
                console.error(`❌ Error restoring lead for ${studentName}:`, err.message);
            }
        }
    }

    console.log(`\n🎉 Completed! Successfully restored ${createdCount} missing enrolled leads.`);
}

restoreMissingLeads()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
