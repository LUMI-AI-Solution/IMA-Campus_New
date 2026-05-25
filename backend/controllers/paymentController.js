const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const safeJson = (data) => JSON.parse(JSON.stringify(data, (key, value) => typeof value === 'bigint' ? value.toString() : value));

// Helper: Sync verified payments with corresponding CRM Leads (match by last 7 digits to resolve prefix changes)
const syncLeadEnrollment = async (studentId, paymentType) => {
    try {
        if (!studentId) return;
        const student = await prisma.user.findUnique({ where: { id: parseInt(studentId) } });
        if (!student || (!student.phone && !student.whatsapp)) return;
        
        const phonesToCheck = [];
        if (student.phone) phonesToCheck.push(student.phone.replace(/[^0-9]/g, ''));
        if (student.whatsapp) phonesToCheck.push(student.whatsapp.replace(/[^0-9]/g, ''));

        const validLast7Digits = phonesToCheck.map(p => p.slice(-7)).filter(p => p.length >= 7);
        if (validLast7Digits.length === 0) return;

        // Find leads containing last 7 digits of the phone
        const leads = await prisma.lead.findMany({
            where: {
                campaignType: 'AFTER_SEMINAR',
                OR: validLast7Digits.map(last7 => ({ phone: { contains: last7 } }))
            }
        });

        if (leads.length > 0) {
            let pIntention = 'MONTHLY';
            const pType = parseInt(paymentType);
            if (pType === 3) pIntention = 'FULL';
            else if (pType === 2) pIntention = 'INSTALLMENT';

            await prisma.lead.updateMany({
                where: { id: { in: leads.map(l => l.id) } },
                data: {
                    enrollmentStatus: 'ENROLLED',
                    paymentIntention: pIntention
                }
            });
            console.log(`[SYNC] Lead updated to ENROLLED for Student ID ${studentId}`);
        }
    } catch (e) {
        console.error("Error syncing lead enrollment status:", e);
    }
};

// ==========================================
// 🏦 PAYMENT CONTROLLER LOGIC (ADMIN)
// ==========================================

// 1. Get All Payments
exports.getPayments = async (req, res) => {
    try {
        const rawPayments = await prisma.payment.findMany({
            include: { student: true, business: true, batch: true },
            orderBy: { created_at: 'desc' }
        });

        const paymentIds = rawPayments.map(p => p.id);
        const deliveries = await prisma.delivery.findMany({
            where: { paymentId: { in: paymentIds } }
        });
        const deliveryMap = {};
        deliveries.forEach(d => deliveryMap[d.paymentId] = true);

        const allCourses = await prisma.course.findMany({ select: { id: true, name: true, price: true, code: true } });
        const courseMap = {};
        allCourses.forEach(c => courseMap[c.id] = c);

        const allInstallments = await prisma.installment.findMany();
        const today = new Date();

        const formattedPayments = await Promise.all(rawPayments.map(async (p) => {
            
            // 🔥 ALUTH DEBUG කෑල්ල: Shehara ගේ විස්තර හරියටම බලමු
            if (p.student && (p.student.firstName.includes('Shehara') || p.student.id === 752)) { 
                console.log(`\n👉 [DEBUG] Payment ID: ${p.id} | Student: STU-${p.studentId}`);
                console.log(`   - DB Real Status: ${p.status} | Payment Type: ${p.payment_type}`);
                console.log(`   - Valid Until: ${p.valid_until} | Post Pay Days: ${p.post_pay_days}`);
            }

            let currentStatus = 'Pending';
            
            if (p.status === 5) currentStatus = 'Trash'; 
            else if (parseInt(p.payment_type) === 1 && p.status === 1 && p.valid_until && new Date(p.valid_until) < today) {
                currentStatus = 'Non Paid';
                await prisma.payment.update({ where: { id: p.id }, data: { status: 3 } });
            } 
            // 🔥 Post Pay 7 Days Expire Check (Auto revert to Pending & Revoke Access)
            else if (p.status === 4 && p.valid_until && new Date(p.valid_until) < today) {
                currentStatus = 'Pending';
                await prisma.payment.update({ where: { id: p.id }, data: { status: 0, valid_until: null, post_pay_days: 0 } });
            }
            else if (p.status === 0 && p.method === 'Upcoming') currentStatus = 'Upcoming';
            else if (p.status === 0) currentStatus = 'Pending';
            else if (p.status === 1) {
                if (p.amount === 0 && p.remark && p.remark.includes('Free Card')) currentStatus = 'Free Card';
                else if (p.remark && p.remark.includes('Custom Breakdown')) currentStatus = 'Discount';
                else currentStatus = 'Approved';
            }
            else if (p.status === 2) currentStatus = 'Rejected';
            else if (p.status === 3) currentStatus = 'Non Paid';
            else if (p.status === 4) currentStatus = 'Post Pay';

            // 🔥 Status Check කරාට පස්සේ Current Status එක Print කරමු
            if (p.student && (p.student.firstName.includes('Shehara') || p.student.id === 752)) { 
                console.log(`   - Mapped Status (Going to Frontend): ${currentStatus}`);
            }

            let systemTotal = 0; let parsedSubjects = []; let totalPhases = 1;

            if (p.subjects) {
                try {
                    const subIds = JSON.parse(p.subjects);
                    parsedSubjects = subIds.map(id => {
                        const course = courseMap[parseInt(id)];
                        if (course) systemTotal += parseFloat(course.price || 0);
                        return course || { id, name: 'Unknown Course', price: 0, code: 'N/A' };
                    });

                    if (p.payment_type === 2) {
                        const plan = allInstallments.find(i => i.batchId === p.batchId && i.subjectCount <= subIds.length);
                        if (plan && plan.details) {
                            try { totalPhases = JSON.parse(plan.details).length; } catch(e) {}
                        }
                    }
                } catch(e) {}
            }

            return {
                id: p.id,
                studentId: p.studentId,
                studentName: p.student ? `${p.student.firstName} ${p.student.lastName}` : 'Unknown',
                phone: p.student?.phone || p.student?.whatsapp || 'N/A',
                studentNo: p.student?.id ? `STU-${p.student.id}` : 'STU-000',
                businessId: p.businessId, batchId: p.batchId, groupId: p.groupId,
                business: p.business?.name || 'N/A', batch: p.batch?.name || 'N/A',
                amount: p.amount || 0,
                systemTotal: systemTotal, 
                subjectsList: parsedSubjects, 
                type: parseInt(p.payment_type) === 1 ? 'Monthly' : (parseInt(p.payment_type) === 2 ? 'Installment' : 'Full'),
                method: p.method || 'Slip',
                status: currentStatus,
                date: p.created_at ? new Date(p.created_at).toISOString().split('T')[0] : '-',
                dueDate: p.due_date ? new Date(p.due_date).toISOString().split('T')[0] : null,
                installmentNo: p.installment_no || 1,
                totalPhases: totalPhases,
                slips: p.slip_image ? p.slip_image.split(',') : [],
                remark: p.remark || '',
                daysLeft: p.post_pay_days || 0,
                validUntil: p.valid_until,
                excessAmount: p.excessAmount || 0,
                arrearsAmount: p.arrearsAmount || 0,
                hasDelivery: deliveryMap[p.id] || false
            };
        }));

        res.status(200).json(safeJson(formattedPayments));
    } catch (error) { 
        res.status(500).json([]); 
    }
};

// 2. Action for Standard Payments (Approve/Reject/Trash/SendToDelivery)
exports.paymentAction = async (req, res) => {
    try {
        const { paymentId, action, customAmount, remark, isSelfPicked, actualAmountPaid } = req.body;
        let updateData = {};
        
        const payRecord = await prisma.payment.findUnique({ where: { id: parseInt(paymentId) }});
        if (!payRecord) return res.status(404).json({ error: "Payment not found" });

        // 🔥 Send to Delivery Hub manually for Free Cards / Discounts
        if (action === 'SendToDelivery') {
            const existingDelivery = await prisma.delivery.findUnique({ where: { paymentId: parseInt(paymentId) } });
            if (!existingDelivery && payRecord.subjects) {
                try {
                    const subIds = JSON.parse(payRecord.subjects).map(id => parseInt(id));
                    const courses = await prisma.course.findMany({ where: { id: { in: subIds } } });
                    if (courses.length > 0) {
                        const paymentTypeStr = parseInt(payRecord.payment_type) === 1 ? 'Monthly' : (parseInt(payRecord.payment_type) === 2 ? 'Installment' : 'Full');
                        await prisma.delivery.create({
                            data: {
                                paymentId: payRecord.id, studentId: payRecord.studentId.toString(), businessId: payRecord.businessId,
                                paymentType: paymentTypeStr, status: 'Pending',
                                items: { create: courses.map(c => ({ courseId: c.id, tuteName: c.name || "Tute", quantity: 1 })) }
                            }
                        });
                        return res.status(200).json({ message: `Sent to Delivery Hub successfully` });
                    }
                } catch(e) { return res.status(500).json({ error: "Failed to create delivery" }); }
            }
            return res.status(200).json({ message: `Already in Delivery Hub` });
        }

        if (action === 'Trash') {
            updateData.status = 5; 
        } else if (action === 'Reject') {
            updateData.status = 2;
        } else if (action === 'Approve') {
            updateData.status = 1;
            updateData.post_pay_days = 0; // Clear post pay if it was granted
            
            // 🔥 WALLET LOGIC INTEGRATION
            const expectedAmount = parseFloat(payRecord.amount);
            const actualPaid = actualAmountPaid ? parseFloat(actualAmountPaid) : expectedAmount;
            const difference = actualPaid - expectedAmount; 

            if (difference !== 0) {
                await prisma.user.update({
                    where: { id: payRecord.studentId },
                    data: { walletBalance: { increment: difference } }
                });
                updateData.excessAmount = difference > 0 ? difference : 0;
                updateData.arrearsAmount = difference < 0 ? Math.abs(difference) : 0;
                
                updateData.remark = payRecord.remark 
                    ? `${payRecord.remark}\n\n[SYSTEM]: Wallet adjusted by LKR ${difference.toLocaleString()}` 
                    : `[SYSTEM]: Wallet adjusted by LKR ${difference.toLocaleString()}`;
            }
        } else if (action === 'Free Card') {
            updateData.status = 1;
            updateData.amount = 0;
            if (!remark) return res.status(400).json({ error: "Remark is required for Free Card" });
        } else if (action === 'Discount') {
            updateData.status = 1;
            updateData.amount = parseFloat(customAmount || 0);
            if (!remark) return res.status(400).json({ error: "Remark is required for Discount" });
        }

        if (['Approve', 'Free Card', 'Discount'].includes(action)) {
    if (parseInt(payRecord.payment_type) === 1) { // 🔥 මෙතනටත් parseInt දාන්න
        let validDate = new Date();
        validDate.setDate(validDate.getDate() + 30);
        updateData.valid_until = validDate;
    }
}

        if (remark && action !== 'Trash') {
            updateData.remark = updateData.remark 
                ? `${updateData.remark}\n\n[ADMIN]: ${remark}` 
                : (payRecord.remark ? `${payRecord.remark}\n\n[ADMIN]: ${remark}` : `[ADMIN]: ${remark}`);
        }

        const updatedPayment = await prisma.payment.update({
            where: { id: parseInt(paymentId) },
            data: updateData
        });

        if (['Approve', 'Free Card', 'Discount'].includes(action)) {
            await syncLeadEnrollment(updatedPayment.studentId, updatedPayment.payment_type);
        }

        // 🔥 Auto Delivery ONLY for normal Approve (Not Free Card/Discount)
        if (action === 'Approve') {
            const existingDelivery = await prisma.delivery.findUnique({ where: { paymentId: parseInt(paymentId) } });
            if (!existingDelivery && updatedPayment.subjects) {
                try {
                    const subIds = JSON.parse(updatedPayment.subjects).map(id => parseInt(id));
                    const courses = await prisma.course.findMany({ where: { id: { in: subIds } } });
                    if (courses.length > 0) {
                        const paymentTypeStr = updatedPayment.payment_type === 1 ? 'Monthly' : (updatedPayment.payment_type === 2 ? 'Installment' : 'Full');
                        await prisma.delivery.create({
                            data: {
                                paymentId: updatedPayment.id, studentId: updatedPayment.studentId.toString(), businessId: updatedPayment.businessId,
                                paymentType: paymentTypeStr, status: isSelfPicked ? 'Delivered' : 'Pending',
                                items: { create: courses.map(c => ({ courseId: c.id, tuteName: c.name || "Tute", quantity: 1 })) }
                            }
                        });
                    }
                } catch(e) {}
            }
        }

        res.status(200).json({ message: `Payment processed as ${action}` });
    } catch (error) { 
        res.status(500).json({ error: "Action failed" }); 
    }
};

exports.approveInstallment = async (req, res) => {
    try {
        // 🔥 FIX 1: Frontend එකෙන් එවන nextDueDate එකත් මෙතනට ගන්නවා
        const { paymentId, actualAmountPaid, remark, isSelfPicked, nextDueDate } = req.body;
        
        const payRecord = await prisma.payment.findUnique({ where: { id: parseInt(paymentId) }});
        if (!payRecord) return res.status(404).json({ error: "Payment not found" });

        let updateData = { status: 1, post_pay_days: 0 }; 

        // 🔥 WALLET LOGIC INTEGRATION 
        const expectedAmount = parseFloat(payRecord.amount);
        const actualPaid = actualAmountPaid ? parseFloat(actualAmountPaid) : expectedAmount;
        const difference = actualPaid - expectedAmount;

        if (difference !== 0) {
            await prisma.user.update({
                where: { id: payRecord.studentId },
                data: { walletBalance: { increment: difference } }
            });
            updateData.excessAmount = difference > 0 ? difference : 0;
            updateData.arrearsAmount = difference < 0 ? Math.abs(difference) : 0;
            
            updateData.remark = payRecord.remark 
                ? `${payRecord.remark}\n\n[SYSTEM]: Wallet adjusted by LKR ${difference.toLocaleString()}` 
                : `[SYSTEM]: Wallet adjusted by LKR ${difference.toLocaleString()}`;
        }

        if (remark) {
            updateData.remark = updateData.remark 
                ? `${updateData.remark}\n\n[ADMIN]: ${remark}` 
                : (payRecord.remark ? `${payRecord.remark}\n\n[ADMIN]: ${remark}` : `[ADMIN]: ${remark}`);
        }

        const updatedPayment = await prisma.payment.update({
            where: { id: parseInt(paymentId) },
            data: updateData
        });

        await syncLeadEnrollment(updatedPayment.studentId, updatedPayment.payment_type);

        // 🔥 Auto Delivery Logic
        const existingDelivery = await prisma.delivery.findUnique({ where: { paymentId: parseInt(paymentId) } });
        if (!existingDelivery && updatedPayment.subjects) {
            try {
                const subIds = JSON.parse(updatedPayment.subjects).map(id => parseInt(id));
                const courses = await prisma.course.findMany({ where: { id: { in: subIds } } });
                if (courses.length > 0) {
                    await prisma.delivery.create({
                        data: {
                            paymentId: updatedPayment.id, studentId: updatedPayment.studentId.toString(), businessId: updatedPayment.businessId,
                            paymentType: 'Installment', status: isSelfPicked ? 'Delivered' : 'Pending',
                            items: { create: courses.map(c => ({ courseId: c.id, tuteName: c.name || "Tute", quantity: 1 })) }
                        }
                    });
                }
            } catch(e) {
                console.error("Delivery Creation Error:", e);
            }
        }

        // 🔥 NEXT PHASE GENERATION LOGIC
        if (payRecord.subjects) {
            try {
                const subIds = JSON.parse(payRecord.subjects);
                
                // 🔥 FIX 2: හරියටම සමාන නොවී, ළමයාගේ subject ගාණට ගැලපෙන හොඳම plan එක ගන්න 'lte' (less than or equal) පාවිච්චි කරනවා
                const plan = await prisma.installment.findFirst({
                    where: { 
                        batchId: payRecord.batchId, 
                        subjectCount: { lte: subIds.length } 
                    },
                    orderBy: { subjectCount: 'desc' }
                });

                if (plan && plan.details) {
                    const phases = JSON.parse(plan.details);
                    
                    const currentInstallment = payRecord.installment_no || 1;
                    const currentPhaseIndex = currentInstallment - 1;

                    if (currentPhaseIndex + 1 < phases.length) {
                        const nextPhase = phases[currentPhaseIndex + 1];
                        
                        // 🔥 FIX 3: Frontend එකෙන් එවන Date එක ගන්නවා. ඒක නැත්නම් විතරක් දවස් 30ක් එකතු කරනවා.
                        let finalNextDueDate = nextDueDate ? new Date(nextDueDate) : new Date();
                        if (!nextDueDate) {
                            finalNextDueDate.setDate(finalNextDueDate.getDate() + 30); 
                        }
                        
                        const nextPhaseAmount = parseFloat(nextPhase.price || nextPhase.amount || 0);

                        await prisma.payment.create({
                            data: {
                                studentId: payRecord.studentId,
                                businessId: payRecord.businessId,
                                batchId: payRecord.batchId,
                                groupId: payRecord.groupId,
                                subjects: payRecord.subjects,
                                payment_type: 2, 
                                method: 'Upcoming', 
                                status: 0,
                                amount: nextPhaseAmount,
                                installment_no: currentPhaseIndex + 2,
                                due_date: finalNextDueDate
                            }
                        });
                    }
                }
            } catch (e) {
                console.error("🔥 Auto-Generate Next Installment Error:", e);
            }
        }

        res.status(200).json({ message: "Installment approved successfully" });
    } catch (error) { 
        console.error("Installment Approval General Error:", error);
        res.status(500).json({ error: "Failed to approve installment" }); 
    }
};

// 4. Grant Post Pay (Temporary Access) - Auto generates 7 days
exports.grantPostPay = async (req, res) => {
    try {
        const { paymentId } = req.body;
        
        let validDate = new Date();
        validDate.setDate(validDate.getDate() + 7); // Exactly 7 days

        await prisma.payment.update({
            where: { id: parseInt(paymentId) },
            data: { status: 4, post_pay_days: 7, valid_until: validDate } 
        });
        
        res.status(200).json({ message: `Access granted for 7 days` });
    } catch (error) {
        res.status(500).json({ error: "Failed to grant access" });
    }
};