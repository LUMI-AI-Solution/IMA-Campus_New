// Draft for fixing paymentController.js logic
// Inside syncLeadEnrollment

        if (leads.length > 0) {
            // 1. Identify original inquiry leads
            const inquiryLeads = leads.filter(l =>
                !l.inquiryType || ['NEW_INQ', 'OPEN_SEMINAR', 'NORMAL'].includes(l.inquiryType)
            );

            if (inquiryLeads.length > 0) {
                // Update original inquiry leads so they are marked as ENROLLED
                await prisma.lead.updateMany({
                    where: { id: { in: inquiryLeads.map(l => l.id) } },
                    data: {
                        enrollmentStatus: newEnrollmentStatus,
                        paymentIntention: pIntention
                    }
                });
                console.log(`[SYNC] Original Inquiry Leads updated to ENROLLED for Student ID ${studentId}`);
            }

            // Always check if PAID_CAMP lead exists and update/create it
            const existingPaidLead = leads.find(l => l.inquiryType === 'PAID_CAMP');
            
            if (existingPaidLead) {
                await prisma.lead.update({
                    where: { id: existingPaidLead.id },
                    data: {
                        enrollmentStatus: newEnrollmentStatus,
                        paymentIntention: pIntention
                    }
                });
                console.log(`[SYNC] Existing PAID_CAMP Lead updated to ENROLLED for Student ID ${studentId}`);
            } else if (payment && payment.status === 1) {
                // Only create fresh PAID_CAMP lead if payment is approved and it doesn't exist
                const basePhone = phonesToCheck[0];
                const businessId = payment?.businessId || student.businessId || 1;
                const batchId = payment?.batchId || student.batchId || null;
                const assignedTo = null; // No original coordinator

                const dbPhoneSuffix = `_BIZ_${businessId}` + (batchId ? `_BATCH_${batchId}` : '') + `_PAID`;
                const newPhone = `${basePhone}${dbPhoneSuffix}`;

                // Check unique constraint first
                const checkExact = await prisma.lead.findUnique({ where: { phone: newPhone } });
                if (!checkExact) {
                    await prisma.lead.create({
                        data: {
                            name: student.firstName ? `${student.firstName} ${student.lastName || ''}`.trim() : (leads[0]?.name || 'Unknown Student'),
                            phone: newPhone,
                            source: 'system',
                            campaignType: 'AFTER_SEMINAR',
                            inquiryType: 'PAID_CAMP',
                            enrollmentStatus: newEnrollmentStatus,
                            paymentIntention: pIntention,
                            assignedTo: assignedTo,
                            batchId: batchId,
                            coordinationRound: 1,
                            phase: 1,
                            callStatus: 'pending'
                        }
                    });
                    console.log(`[SYNC] Created fresh PAID_CAMP lead for Student ID ${studentId}`);
                } else {
                    await prisma.lead.update({
                        where: { id: checkExact.id },
                        data: {
                            enrollmentStatus: newEnrollmentStatus,
                            paymentIntention: pIntention
                        }
                    });
                }
            }
        } else {
            // No matching lead found at all, create a completely new PAID_CAMP lead if student exists
