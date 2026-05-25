const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncHistoricalLeads() {
    console.log(`\n🕵️‍♂️ RUNNING HISTORICAL LEADS SYNCHRONIZATION (WITH CORRECT MATCHING)`);
    console.log(`⏳ Scanning verified payments and updating corresponding CRM leads to ENROLLED...\n`);

    try {
        // 1. Fetch all verified payments (status 1 or 4) with their student details
        const verifiedPayments = await prisma.payment.findMany({
            where: { status: { in: [1, 4] } },
            include: { student: true }
        });

        console.log(`📦 Found ${verifiedPayments.length} verified payments in the system.`);

        // 2. Fetch all AFTER_SEMINAR CRM leads
        const leads = await prisma.lead.findMany({
            where: { campaignType: 'AFTER_SEMINAR' }
        });

        console.log(`📋 Found ${leads.length} AFTER_SEMINAR leads in the CRM.`);

        // Index leads by the last 9 digits of their phone numbers (split suffix first!)
        const cleanPhoneToLeadsMap = {};
        leads.forEach(l => {
            if (!l.phone) return;
            const mainPhonePart = l.phone.split('_')[0];
            const cleanLeadPhone = mainPhonePart.replace(/[^0-9]/g, '');
            if (cleanLeadPhone.length >= 9) {
                const key = cleanLeadPhone.slice(-9);
                if (!cleanPhoneToLeadsMap[key]) {
                    cleanPhoneToLeadsMap[key] = [];
                }
                cleanPhoneToLeadsMap[key].push(l);
            }
        });

        let updatedLeadsCount = 0;
        let matchedPaymentsCount = 0;
        const unmatchedPayments = [];

        // 3. Match and update leads
        for (const payment of verifiedPayments) {
            if (!payment.student) {
                console.log(`⚠️ Payment ID ${payment.id} has no associated student!`);
                continue;
            }

            const student = payment.student;
            const phonesToCheck = [];
            if (student.phone) phonesToCheck.push(student.phone.replace(/[^0-9]/g, ''));
            if (student.whatsapp) phonesToCheck.push(student.whatsapp.replace(/[^0-9]/g, ''));

            const validLast9Digits = phonesToCheck
                .map(p => p.slice(-9))
                .filter(p => p.length >= 9);

            if (validLast9Digits.length === 0) {
                unmatchedPayments.push({
                    paymentId: payment.id,
                    studentId: student.id,
                    name: `${student.firstName} ${student.lastName}`,
                    phone: student.phone || student.whatsapp || 'N/A',
                    reason: 'No valid phone number'
                });
                continue;
            }

            // Find matching lead(s)
            let matchedLeads = [];
            for (const last9 of validLast9Digits) {
                if (cleanPhoneToLeadsMap[last9]) {
                    matchedLeads = matchedLeads.concat(cleanPhoneToLeadsMap[last9]);
                }
            }

            if (matchedLeads.length > 0) {
                matchedPaymentsCount++;
                
                // Determine payment intention
                let pIntention = 'MONTHLY';
                const pType = parseInt(payment.payment_type);
                if (pType === 3) pIntention = 'FULL';
                else if (pType === 2) pIntention = 'INSTALLMENT';

                // Update matched leads if they are not already ENROLLED or their paymentIntention differs
                for (const lead of matchedLeads) {
                    if (lead.enrollmentStatus !== 'ENROLLED' || lead.paymentIntention !== pIntention) {
                        await prisma.lead.update({
                            where: { id: lead.id },
                            data: {
                                enrollmentStatus: 'ENROLLED',
                                paymentIntention: pIntention
                            }
                        });
                        console.log(`✅ Updated Lead: ID ${lead.id} | Name: ${lead.name} | Phone: ${lead.phone} -> ENROLLED (${pIntention})`);
                        updatedLeadsCount++;
                    }
                }
            } else {
                unmatchedPayments.push({
                    paymentId: payment.id,
                    studentId: student.id,
                    name: `${student.firstName} ${student.lastName}`,
                    phone: student.phone || student.whatsapp || 'N/A',
                    reason: 'Not found in CRM'
                });
            }
        }

        console.log(`\n📊 Historical Sync Statistics:`);
        console.log(`-------------------------------------`);
        console.log(`🔹 Verified payments matched to CRM leads: ${matchedPaymentsCount}`);
        console.log(`🔹 Total CRM lead records updated to ENROLLED: ${updatedLeadsCount}`);
        console.log(`🔸 Direct Signups (verified payments but no CRM lead): ${unmatchedPayments.length}`);
        console.log(`-------------------------------------\n`);

        if (unmatchedPayments.length > 0) {
            console.log(`📋 Sample of Direct Signups (verified but not in CRM):`);
            unmatchedPayments.slice(0, 10).forEach(u => {
                console.log(`  - Student ID: STU-${u.studentId} | Name: ${u.name} | Phone: ${u.phone} (Reason: ${u.reason})`);
            });
            if (unmatchedPayments.length > 10) {
                console.log(`  - ... and ${unmatchedPayments.length - 10} more.`);
            }
        }

    } catch (error) {
        console.error("❌ Sync Error occurred:", error);
    } finally {
        await prisma.$disconnect();
    }
}

syncHistoricalLeads();
