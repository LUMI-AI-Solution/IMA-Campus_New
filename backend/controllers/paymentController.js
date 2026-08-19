const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const { markPaymentOnGSheet } = require('../utils/gsheetUpdater');
const prisma = new PrismaClient();

const safeJson = (data) => JSON.parse(JSON.stringify(data, (key, value) => typeof value === 'bigint' ? value.toString() : value));

// Helper: Sync verified payments with corresponding CRM Leads (match by last 7 digits to resolve prefix changes)
const syncLeadEnrollment = async (studentId, paymentType, payment) => {
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
                campaignType: { in: ['AFTER_SEMINAR', 'FREE_SEMINAR', 'OPEN_SEMINAR'] },
                OR: validLast7Digits.map(last7 => ({ phone: { contains: last7 } }))
            }
        });

        let pIntention = 'MONTHLY';
        const pType = parseInt(paymentType);
        if (pType === 3) pIntention = 'FULL';
        else if (pType === 2) pIntention = 'INSTALLMENT';

        let newEnrollmentStatus = 'NON_ENROLLED';
        if (payment && payment.status === 1) newEnrollmentStatus = 'ENROLLED';
        else if (payment && (payment.status === 0 || payment.status === 4)) newEnrollmentStatus = 'PAYMENT_PROCESSING';
        else if (payment && (payment.status === 2 || payment.status === 5)) newEnrollmentStatus = 'NON_ENROLLED';

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

                // Check if a duplicate PAID_CAMP lead somehow exists, update it too just in case
                const existingPaidLead = leads.find(l => l.inquiryType === 'PAID_CAMP');
                if (existingPaidLead) {
                    await prisma.lead.update({
                        where: { id: existingPaidLead.id },
                        data: {
                            enrollmentStatus: newEnrollmentStatus,
                            paymentIntention: pIntention
                        }
                    });
                }
            } else {
                // No inquiry leads, check if PAID_CAMP lead already exists
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
                } else {
                    // Create fresh PAID_CAMP lead record
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
            }
        } else {
            // No matching lead found at all, create a completely new PAID_CAMP lead if student exists
            const basePhone = phonesToCheck[0];
            const businessId = payment?.businessId || student.businessId || 1;
            const batchId = payment?.batchId || student.batchId || null;
            const assignedTo = null;

            const dbPhoneSuffix = `_BIZ_${businessId}` + (batchId ? `_BATCH_${batchId}` : '') + `_PAID`;
            const newPhone = `${basePhone}${dbPhoneSuffix}`;

            const checkExact = await prisma.lead.findUnique({ where: { phone: newPhone } });
            if (!checkExact) {
                await prisma.lead.create({
                    data: {
                        name: student.firstName ? `${student.firstName} ${student.lastName || ''}`.trim() : 'Unknown Student',
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
                console.log(`[SYNC] Created new independent PAID_CAMP lead for Student ID ${studentId}`);
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
    } catch (e) {
        console.error("Error syncing lead enrollment status:", e);
    }
};

// Helper: Deduce deliverable tutes for a payment based on Content Hub groupPrices rules and TuteStock
const getDeliverableCoursesForPayment = async (payment, courses) => {
    const deliverableCoursesMap = new Map();
    const parsedPType = parseInt(payment.payment_type);

    for (const course of courses) {
        let deliverTute = false;
        let tuteName = course.name || "Tute";
        let tuteImage = null;

        if (course.groupPrices && payment.groupId) {
            try {
                const gps = JSON.parse(course.groupPrices);
                const match = gps.find(g => g.groupId == payment.groupId);
                if (match) {
                    if (match.deliverTute === true || match.deliverTute === 'true') {
                        if (match.tutes && Array.isArray(match.tutes) && match.tutes.length > 0) {
                            match.tutes.forEach(t => {
                                const tName = t.name || t.tuteName || tuteName;
                                const tCover = t.cover || t.tuteCover || null;
                                const key = `${course.id}_${tName}`;
                                if (!deliverableCoursesMap.has(key)) {
                                    deliverableCoursesMap.set(key, { courseId: course.id, tuteName: tName, tuteImage: tCover, quantity: 1 });
                                } else {
                                    const existing = deliverableCoursesMap.get(key);
                                    existing.quantity += 1;
                                }
                            });
                        } else {
                            deliverTute = true;
                            if (match.tuteName && match.tuteName.trim()) {
                                tuteName = match.tuteName.trim();
                            }
                            if (match.tuteCover && match.tuteCover.trim()) {
                                tuteImage = match.tuteCover.trim();
                            }
                        }
                    }
                }
            } catch (e) { }
        }

        if (deliverTute) {
            const key = `${course.id}_${tuteName}`;
            if (!deliverableCoursesMap.has(key)) {
                deliverableCoursesMap.set(key, { courseId: course.id, tuteName: tuteName, tuteImage: typeof tuteImage !== 'undefined' ? tuteImage : null, quantity: 1 });
            } else {
                const existing = deliverableCoursesMap.get(key);
                existing.quantity += 1;
            }
        }
    }

    return Array.from(deliverableCoursesMap.values());
};

// ==========================================
// 🏦 PAYMENT CONTROLLER LOGIC (ADMIN)
// ==========================================

// 1. Get All Payments
exports.getPayments = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const userRole = req.user.role;
        const businessType = req.user.businessType;
        const userDepartment = req.user.department;
        
        const roleUpper = userRole ? userRole.toUpperCase().replace(/ /g, '_') : '';
        const isAdmin = ['SYSTEM_ADMIN', 'DIRECTOR'].includes(roleUpper) || userDepartment === 'Finance';
        
        let whereClause = {};
        
        if (!isAdmin) {
            const allBiz = await prisma.business.findMany();
            const myBizs = allBiz.filter(biz => {
                const isManagerOf = biz.head_manager_id === userId || biz.ass_manager_id === userId;
                const matchesBizType = businessType && (
                    String(biz.id) === String(businessType).trim() ||
                    biz.name.toLowerCase().trim() === String(businessType).toLowerCase().trim() ||
                    biz.name.toLowerCase().includes(String(businessType).toLowerCase().trim()) ||
                    String(businessType).toLowerCase().trim().includes(biz.name.toLowerCase().trim())
                );
                return isManagerOf || matchesBizType;
            });
            const myBizIds = myBizs.map(b => b.id);
            whereClause = { businessId: { in: myBizIds } };
        }

        const rawPayments = await prisma.payment.findMany({
            where: whereClause,
            include: { student: true, business: true, batch: true, group: true },
            orderBy: { created_at: 'desc' }
        });

        const paymentIds = rawPayments.map(p => p.id);
        const deliveries = await prisma.delivery.findMany({
            where: { paymentId: { in: paymentIds } }
        });
        const deliveryMap = {};
        deliveries.forEach(d => deliveryMap[d.paymentId] = true);

        const allCourses = await prisma.course.findMany({ select: { id: true, name: true, price: true, code: true, isDiscountExcluded: true } });
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
            // 🔥 AUTO EXPIRE LOGIC REMOVED AS PER REQUIREMENT - MONTHLY PAYMENTS NO LONGER EXPIRE
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
                    const subIds = JSON.parse(p.subjects).map(id => parseInt(id));
                    
                    let customPricesMap = {};
                    if (p.remark && p.remark.includes('[CUSTOM_PRICES:')) {
                        try {
                            const match = p.remark.match(/\[CUSTOM_PRICES:({.*?})\]/);
                            if (match) {
                                customPricesMap = JSON.parse(match[1]);
                            }
                        } catch (e) { }
                    }

                    // Get group discount rules if any
                    let activeGroupDiscount = null;
                    if (p.group && p.group.discount_rules && (!p.remark || !p.remark.includes('[UPGRADE]'))) {
                        try {
                            const rules = JSON.parse(p.group.discount_rules);
                            if (Array.isArray(rules)) {
                                rules.sort((a, b) => b.courseCount - a.courseCount);
                                
                                const eligibleSubjectsCount = subIds.filter(id => {
                                    const c = courseMap[id];
                                    return c && !c.isDiscountExcluded;
                                }).length;

                                for (let rule of rules) {
                                    if (eligibleSubjectsCount >= rule.courseCount) {
                                        activeGroupDiscount = { 
                                            triggerCount: rule.courseCount, 
                                            newPricePerCourse: rule.pricePerCourse,
                                            fixedDiscount: rule.fixedDiscount
                                        };
                                        break;
                                    }
                                }
                            }
                        } catch (e) {}
                    }

                    parsedSubjects = subIds.map(id => {
                        const course = courseMap[id];
                        let price = course ? parseFloat(course.price || 0) : 0;
                        const strId = String(id);
                        if (customPricesMap[strId] !== undefined) {
                            price = parseFloat(customPricesMap[strId]);
                        } else if (activeGroupDiscount && course && !course.isDiscountExcluded) {
                            if (activeGroupDiscount.newPricePerCourse !== undefined) {
                                price = parseFloat(activeGroupDiscount.newPricePerCourse);
                            }
                        }
                        
                        if (course) {
                            systemTotal += price;
                            return { ...course, price };
                        }
                        return { id, name: 'Unknown Course', price, code: 'N/A' };
                    });

                    // Apply fixed discount if present in activeGroupDiscount
                    if (activeGroupDiscount && activeGroupDiscount.fixedDiscount !== undefined) {
                        systemTotal -= parseFloat(activeGroupDiscount.fixedDiscount);
                    }

                    // Apply Bundle Discount if configured in AppSettings (Only for Upgrades!)
                    if (p.batchId && p.remark && p.remark.includes('[UPGRADE]')) {
                        const richConfigRec = await prisma.appSetting.findUnique({
                            where: { key: `UPGRADE_RICH_CONFIG_BATCH_${p.batchId}` }
                        });
                        if (richConfigRec) {
                            const rich = JSON.parse(richConfigRec.value);
                            if (rich && rich.enableBundle) {
                                const eligibleIds = rich.bundleSubjects ? rich.bundleSubjects.map(id => parseInt(id)) : [];
                                const allEligible = subIds.every(id => eligibleIds.includes(id));
                                if (allEligible) {
                                    if (subIds.length === 2 && rich.bundle2Price > 0) {
                                        systemTotal = parseFloat(rich.bundle2Price);
                                    } else if (subIds.length === 3 && rich.bundle3Price > 0) {
                                        systemTotal = parseFloat(rich.bundle3Price);
                                    }
                                }
                            }
                        }
                    }

                    if (p.payment_type === 2) {
                        const plan = allInstallments.find(i => i.batchId === p.batchId && i.subjectCount <= subIds.length);
                        if (plan && plan.details) {
                            try { totalPhases = JSON.parse(plan.details).length; } catch (e) { }
                        }
                    }
                } catch (e) { }
            }

            const walletBalance = parseFloat(p.student?.walletBalance || 0);
            const baseTotal = systemTotal;
            // Negative walletBalance means Arrears (Add to total), Positive means Excess (Reduce from total)
            systemTotal = systemTotal - walletBalance;
            if (systemTotal < 0) systemTotal = 0; // Prevent negative expected amount
            
            return {
                id: p.id,
                studentId: p.studentId,
                studentName: p.student ? `${p.student.firstName} ${p.student.lastName}` : 'Unknown',
                phone: p.student?.phone || p.student?.whatsapp || 'N/A',
                studentNo: p.student?.id ? `STU-${p.student.id}` : 'STU-000',
                businessId: p.businessId, batchId: p.batchId, groupId: p.groupId,
                business: p.business?.name || 'N/A', batch: p.batch?.name || 'N/A',
                groupName: p.group?.name || 'Unknown',
                amount: p.amount || 0,
                systemTotal: systemTotal,
                baseTotal: baseTotal,
                walletBalance: walletBalance,
                isUpgrade: p.remark ? p.remark.includes('[UPGRADE]') : false,
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
                hasDelivery: deliveryMap[p.id] || false,
                aiVerified: p.aiVerified || false
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
        const adminId = req.user?.userId || req.user?.id;
        let updateData = {};
        if (adminId) {
            updateData.actionedById = parseInt(adminId);
        }

        const payRecord = await prisma.payment.findUnique({ where: { id: parseInt(paymentId) } });
        if (!payRecord) return res.status(404).json({ error: "Payment not found" });

        // 🔥 Send to Delivery Hub manually for Free Cards / Discounts
        if (action === 'SendToDelivery') {
            const existingDelivery = await prisma.delivery.findUnique({ where: { paymentId: parseInt(paymentId) } });
            if (!existingDelivery && payRecord.subjects) {
                try {
                    let subIds = JSON.parse(payRecord.subjects).map(id => parseInt(id));
                    
                    // Filter by selectedSubjectIds if provided from frontend modal
                    if (req.body.selectedSubjectIds && Array.isArray(req.body.selectedSubjectIds)) {
                        const selectedIds = req.body.selectedSubjectIds.map(id => parseInt(id));
                        subIds = subIds.filter(id => selectedIds.includes(id));
                    }

                    if (subIds.length === 0) {
                        return res.status(400).json({ error: "Please select at least one subject to send to delivery" });
                    }

                    const courses = await prisma.course.findMany({ where: { id: { in: subIds } } });
                    if (courses.length > 0) {
                        const deliverableItems = await getDeliverableCoursesForPayment(payRecord, courses);
                        const finalItems = deliverableItems.length > 0 ? deliverableItems : courses.map(c => ({ courseId: c.id, tuteName: c.name || "Tute", quantity: 1 }));
                        const paymentTypeStr = parseInt(payRecord.payment_type) === 1 ? 'Monthly' : (parseInt(payRecord.payment_type) === 2 ? 'Installment' : 'Full');
                        await prisma.delivery.create({
                            data: {
                                paymentId: payRecord.id, studentId: payRecord.studentId.toString(), businessId: payRecord.businessId,
                                paymentType: paymentTypeStr, status: 'Pending',
                                items: { create: finalItems }
                            }
                        });
                        return res.status(200).json({ message: `Sent to Delivery Hub successfully` });
                    }
                } catch (e) { return res.status(500).json({ error: "Failed to create delivery" }); }
            }
            return res.status(200).json({ message: `Already in Delivery Hub` });
        }

        if (action === 'Trash') {
            updateData.status = 5;
        } else if (action === 'Reject') {
            updateData.status = 2;
        } else if (action === 'Approve') {
            updateData.status = 1;
            updateData.post_pay_days = 0;

            // 🔥 WALLET SETTLEMENT LOGIC 🔥
            // ළමයාගේ wallet එකෙන් කොච්චර ගාණක් මේ payment එකට පාවිච්චි වුණාද කියලා හොයාගෙන ඒක settle කරනවා
            let appliedWalletBalance = 0;
            if (payRecord.remark) {
                const excessMatch = payRecord.remark.match(/Wallet Excess \(-LKR ([\d,.]+)\) applied/i);
                if (excessMatch) appliedWalletBalance = -parseFloat(excessMatch[1].replace(/,/g, ''));

                const dueMatch = payRecord.remark.match(/Wallet Due \(\+LKR ([\d,.]+)\) applied/i);
                if (dueMatch) appliedWalletBalance = parseFloat(dueMatch[1].replace(/,/g, ''));
            }

            const expectedAmount = parseFloat(payRecord.amount || 0);
            const actualPaid = actualAmountPaid !== undefined && actualAmountPaid !== null ? parseFloat(actualAmountPaid) : expectedAmount;
            const difference = actualPaid - expectedAmount;

            // ඇඩ්මින් වෙනස් කරපු ගාණයි, කලින් apply වෙලා තිබ්බ ගාණයි දෙකම සලකලා අවසන් wallet update එක හදනවා
            const totalWalletIncrement = difference + appliedWalletBalance;

            if (totalWalletIncrement !== 0) {
                await prisma.user.update({
                    where: { id: payRecord.studentId },
                    data: { walletBalance: { increment: totalWalletIncrement } }
                });
                updateData.excessAmount = difference > 0 ? difference : 0;
                updateData.arrearsAmount = difference < 0 ? Math.abs(difference) : 0;

                let sysNote = `[SYSTEM]: Wallet adjusted by LKR ${totalWalletIncrement > 0 ? '+' : ''}${totalWalletIncrement.toLocaleString()}`;
                if (appliedWalletBalance !== 0) sysNote += ` (Included settlement of LKR ${appliedWalletBalance > 0 ? '+' : ''}${appliedWalletBalance.toLocaleString()})`;

                updateData.remark = payRecord.remark
                    ? `${payRecord.remark}\n\n${sysNote}`
                    : sysNote;
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

        // Validity Date සෙට් කිරීම
        if (['Approve', 'Free Card', 'Discount'].includes(action)) {
            if (parseInt(payRecord.payment_type) === 1) {
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

        // Sync leads and CRM
        if (['Approve', 'Free Card', 'Discount'].includes(action)) {
            await syncLeadEnrollment(updatedPayment.studentId, updatedPayment.payment_type, updatedPayment);
        }

        // 🔥 Auto Delivery ONLY for normal Approve (Not Free Card/Discount)
        if (action === 'Approve') {
            let shouldCreateDelivery = true;
            if (updatedPayment.payment_type === 1) {
                if (updatedPayment.groupId) {
                    const ext = await prisma.delivery.findFirst({
                        where: { studentId: updatedPayment.studentId.toString(), paymentType: 'Monthly', payment: { groupId: updatedPayment.groupId } }
                    });
                    if (ext) shouldCreateDelivery = false;
                }
            } else if (updatedPayment.payment_type === 2 || updatedPayment.payment_type === 3) {
                if (updatedPayment.batchId) {
                    const ext = await prisma.delivery.findFirst({
                        where: { studentId: updatedPayment.studentId.toString(), paymentType: { in: ['Installment', 'Full'] }, payment: { batchId: updatedPayment.batchId } }
                    });
                    if (ext) shouldCreateDelivery = false;
                }
            }

            if (shouldCreateDelivery && updatedPayment.subjects) {
                try {
                    const subIds = JSON.parse(updatedPayment.subjects).map(id => parseInt(id));
                    const courses = await prisma.course.findMany({ where: { id: { in: subIds } } });
                    if (courses.length > 0) {
                        const deliverableItems = await getDeliverableCoursesForPayment(updatedPayment, courses);
                        if (deliverableItems.length > 0) {
                            const paymentTypeStr = updatedPayment.payment_type === 1 ? 'Monthly' : (updatedPayment.payment_type === 2 ? 'Installment' : 'Full');
                            await prisma.delivery.create({
                                data: {
                                    paymentId: updatedPayment.id, studentId: updatedPayment.studentId.toString(), businessId: updatedPayment.businessId,
                                    paymentType: paymentTypeStr, status: isSelfPicked ? 'Delivered' : 'Pending',
                                    items: { create: deliverableItems }
                                }
                            });
                        }
                    }
                } catch (e) {
                    console.error("Auto Delivery Creation Error on Approve:", e);
                }
            }
        }

        // Trigger GSheet sync asynchronously for Approve/Reject/Free Card/Discount
        if (['Approve', 'Free Card', 'Discount', 'Reject'].includes(action)) {
            markPaymentOnGSheet(paymentId).catch(e => console.error("GSheet Update Error:", e));
        }

        res.status(200).json({ message: `Payment processed as ${action}` });
    } catch (error) {
        res.status(500).json({ error: "Action failed" });
    }
};

exports.approveInstallment = async (req, res) => {
    try {
        const { paymentId, actualAmountPaid, remark, isSelfPicked, nextDueDate } = req.body;

        const payRecord = await prisma.payment.findUnique({ where: { id: parseInt(paymentId) } });
        if (!payRecord) return res.status(404).json({ error: "Payment not found" });

        let updateData = { status: 1, post_pay_days: 0 };

        // 🔥 WALLET SETTLEMENT LOGIC 🔥
        let appliedWalletBalance = 0;
        if (payRecord.remark) {
            const excessMatch = payRecord.remark.match(/Wallet Excess \(-LKR ([\d,.]+)\) applied/i);
            if (excessMatch) appliedWalletBalance = -parseFloat(excessMatch[1].replace(/,/g, ''));

            const dueMatch = payRecord.remark.match(/Wallet Due \(\+LKR ([\d,.]+)\) applied/i);
            if (dueMatch) appliedWalletBalance = parseFloat(dueMatch[1].replace(/,/g, ''));
        }

        const expectedAmount = parseFloat(payRecord.amount || 0);
        const actualPaid = actualAmountPaid !== undefined && actualAmountPaid !== null ? parseFloat(actualAmountPaid) : expectedAmount;
        const difference = actualPaid - expectedAmount;

        const totalWalletIncrement = difference + appliedWalletBalance;

        if (totalWalletIncrement !== 0) {
            await prisma.user.update({
                where: { id: payRecord.studentId },
                data: { walletBalance: { increment: totalWalletIncrement } }
            });
            updateData.excessAmount = difference > 0 ? difference : 0;
            updateData.arrearsAmount = difference < 0 ? Math.abs(difference) : 0;

            let sysNote = `[SYSTEM]: Wallet adjusted by LKR ${totalWalletIncrement > 0 ? '+' : ''}${totalWalletIncrement.toLocaleString()}`;
            if (appliedWalletBalance !== 0) sysNote += ` (Included settlement of LKR ${appliedWalletBalance > 0 ? '+' : ''}${appliedWalletBalance.toLocaleString()})`;

            updateData.remark = payRecord.remark
                ? `${payRecord.remark}\n\n${sysNote}`
                : sysNote;
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

        await syncLeadEnrollment(updatedPayment.studentId, updatedPayment.payment_type, updatedPayment);



        // 🔥 Auto Delivery Logic
        let shouldCreateDelivery = true;
        if (updatedPayment.batchId) {
            const ext = await prisma.delivery.findFirst({
                where: { studentId: updatedPayment.studentId.toString(), paymentType: { in: ['Installment', 'Full'] }, payment: { batchId: updatedPayment.batchId } }
            });
            if (ext) shouldCreateDelivery = false;
        }

        if (shouldCreateDelivery && updatedPayment.subjects) {
            try {
                const subIds = JSON.parse(updatedPayment.subjects).map(id => parseInt(id));
                const courses = await prisma.course.findMany({ where: { id: { in: subIds } } });
                if (courses.length > 0) {
                    const deliverableItems = await getDeliverableCoursesForPayment(updatedPayment, courses);
                    if (deliverableItems.length > 0) {
                        await prisma.delivery.create({
                            data: {
                                paymentId: updatedPayment.id, studentId: updatedPayment.studentId.toString(), businessId: updatedPayment.businessId,
                                paymentType: 'Installment', status: isSelfPicked ? 'Delivered' : 'Pending',
                                items: { create: deliverableItems }
                            }
                        });
                    }
                }
            } catch (e) {
                console.error("Delivery Creation Error in approveInstallment:", e);
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
                                payment_type: parseInt(payRecord.payment_type) || 2, // 👈 100% ක්ම Integer එකක් බව ෂුවර් කරනවා
                                method: 'Upcoming',
                                status: 0, // ළමයා ඊළඟ මාසේ මේක ගෙවලා Approve කරනකම් මේක 0 වෙලා තියෙන්නේ
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

        // Trigger GSheet sync asynchronously
        markPaymentOnGSheet(paymentId).catch(e => console.error("GSheet Update Error in approveInstallment:", e));

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

// 5. Get All Courses
exports.getAllCourses = async (req, res) => {
    try {
        const courses = await prisma.course.findMany({
            orderBy: { name: 'asc' }
        });
        res.status(200).json(safeJson(courses));
    } catch (e) {
        res.status(500).json([]);
    }
};

// 6. Update Payment Details (Subjects and Amount)
exports.updatePaymentDetails = async (req, res) => {
    try {
        const { paymentId, subjects, customPrices, amount } = req.body;

        if (!paymentId || !Array.isArray(subjects)) {
            return res.status(400).json({ error: "Invalid paymentId or subjects array." });
        }

        const payRecord = await prisma.payment.findUnique({ where: { id: parseInt(paymentId) } });
        if (!payRecord) return res.status(404).json({ error: "Payment not found" });

        // Calculate expected total based on customPrices
        let systemTotal = 0;
        const allCourses = await prisma.course.findMany({ select: { id: true, price: true } });
        const courseMap = {};
        allCourses.forEach(c => courseMap[c.id] = c);

        subjects.forEach(id => {
            const courseId = parseInt(id);
            let price = courseMap[courseId] ? parseFloat(courseMap[courseId].price || 0) : 0;
            if (customPrices && customPrices[courseId] !== undefined) {
                price = parseFloat(customPrices[courseId]);
            }
            systemTotal += price;
        });

        const diff = parseFloat(amount) - systemTotal;
        const excessAmount = diff > 0 ? diff : 0;
        const arrearsAmount = diff < 0 ? Math.abs(diff) : 0;

        let cleanRemark = payRecord.remark || "";
        cleanRemark = cleanRemark.replace(/\[CUSTOM_PRICES:.*?\]/g, "").trim();

        let finalRemark = cleanRemark;
        if (customPrices && Object.keys(customPrices).length > 0) {
            const customPricesStr = `[CUSTOM_PRICES:${JSON.stringify(customPrices)}]`;
            finalRemark = cleanRemark ? `${cleanRemark}\n\n${customPricesStr}` : customPricesStr;
        }

        // Update the payment record
        const updatedPayment = await prisma.payment.update({
            where: { id: parseInt(paymentId) },
            data: {
                subjects: JSON.stringify(subjects.map(id => parseInt(id))),
                amount: parseFloat(amount),
                excessAmount: excessAmount,
                arrearsAmount: arrearsAmount,
                remark: finalRemark || null
            }
        });

        // Sync with tute deliveries if they exist
        const delivery = await prisma.delivery.findUnique({
            where: { paymentId: parseInt(paymentId) }
        });

        if (delivery) {
            // Fetch new courses
            const courses = await prisma.course.findMany({
                where: { id: { in: subjects.map(id => parseInt(id)) } }
            });

            const deliverableItems = await getDeliverableCoursesForPayment(updatedPayment, courses);

            if (deliverableItems.length > 0) {
                // Delete old items and re-create updated items
                await prisma.deliveryItem.deleteMany({
                    where: { deliveryId: delivery.id }
                });

                await prisma.deliveryItem.createMany({
                    data: deliverableItems.map(item => ({
                        deliveryId: delivery.id,
                        courseId: item.courseId,
                        tuteName: item.tuteName,
                        tuteImage: item.tuteImage || null,
                        quantity: item.quantity || 1
                    }))
                });
            } else {
                // If no deliverable tutes exist under Content Hub rules, remove the orphaned delivery
                await prisma.deliveryItem.deleteMany({ where: { deliveryId: delivery.id } });
                await prisma.delivery.delete({ where: { id: delivery.id } });
            }
        }

        res.status(200).json({ message: "Payment details updated successfully", payment: updatedPayment });
    } catch (error) {
        console.error("Update payment details error:", error);
        res.status(500).json({ error: "Failed to update payment details" });
    }
};

exports.getStaffStatsReport = async (req, res) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        const userRole = req.user?.role;
        const businessType = req.user?.businessType;
        const userDepartment = req.user?.department;
        
        const roleUpper = userRole ? userRole.toUpperCase().replace(/ /g, '_') : '';
        const isAdmin = ['SYSTEM_ADMIN', 'DIRECTOR'].includes(roleUpper) || userDepartment === 'Finance';

        const { dateFrom, dateTo, verificationMethod, action } = req.query;

        let where = {};
        
        if (!isAdmin && userId) {
            const allBiz = await prisma.business.findMany();
            const myBizs = allBiz.filter(biz => {
                const isManagerOf = biz.head_manager_id === userId || biz.ass_manager_id === userId;
                const matchesBizType = businessType && (
                    String(biz.id) === String(businessType).trim() ||
                    biz.name.toLowerCase().trim() === String(businessType).toLowerCase().trim() ||
                    biz.name.toLowerCase().includes(String(businessType).toLowerCase().trim()) ||
                    String(businessType).toLowerCase().trim().includes(biz.name.toLowerCase().trim())
                );
                return isManagerOf || matchesBizType;
            });
            const myBizIds = myBizs.map(b => b.id);
            
            // If the manager has no businesses, they shouldn't see anything.
            if (myBizIds.length === 0) {
                return res.status(200).json({
                    success: true,
                    data: [],
                    summary: { aiVerified: 0, manualVerified: 0, rejected: 0, total: 0 }
                });
            }
            where.businessId = { in: myBizIds };
        }

        if (dateFrom && dateTo) {
            where.updatedAt = {
                gte: new Date(`${dateFrom}T00:00:00.000Z`),
                lte: new Date(`${dateTo}T23:59:59.999Z`)
            };
        }

        if (verificationMethod === 'ai') {
            where.aiVerified = true;
        } else if (verificationMethod === 'manual') {
            where.aiVerified = false;
        }

        if (action === 'approved') {
            where.status = 1;
        } else if (action === 'rejected') {
            where.status = 2;
        } else if (action === 'postpay') {
            where.status = 4;
        } else if (['quick_approve', 'discount_approve', 'adjust_approve', 'upgrade_approve', 'installment_approve'].includes(action)) {
            where.status = 1;
        }

        const payments = await prisma.payment.findMany({
            where,
            include: {
                student: { select: { firstName: true, lastName: true, phone: true } },
                actionedUser: { select: { firstName: true, lastName: true } },
                batch: { select: { name: true } },
                business: { select: { name: true } }
            },
            orderBy: { updatedAt: 'desc' },
            take: 1000
        });

        let summary = {
            aiVerified: 0,
            manualVerified: 0,
            rejected: 0,
            total: payments.length,
            quickApprove: 0,
            discountApprove: 0,
            adjustApprove: 0,
            upgradeApprove: 0,
            installmentApprove: 0
        };

        const reportData = payments.map(p => {
            const isAi = p.aiVerified === true;
            if (isAi && p.status === 1) summary.aiVerified++;
            else if (!isAi && p.status === 1) summary.manualVerified++;
            else if (p.status === 2) summary.rejected++;

            let approveType = null;
            if (p.status === 1) {
                const isUpgrade = p.remark && p.remark.includes('[UPGRADE]');
                const isAdjusted = parseFloat(p.excessAmount || 0) > 0 || parseFloat(p.arrearsAmount || 0) > 0;
                const isInstallment = p.payment_type === 2;
                const isDiscount = p.remark && p.remark.includes('Custom Breakdown');
                
                if (isUpgrade) {
                    approveType = 'Upgrade Approve';
                    summary.upgradeApprove++;
                } else if (isAdjusted) {
                    approveType = 'Adjust Approve';
                    summary.adjustApprove++;
                } else if (isInstallment) {
                    approveType = 'Installment Approve';
                    summary.installmentApprove++;
                } else if (isDiscount) {
                    approveType = 'Discount Approve';
                    summary.discountApprove++;
                } else {
                    approveType = 'Quick Approve';
                    summary.quickApprove++;
                }
            }

            const verifiedBy = p.actionedUser 
                ? `${p.actionedUser.firstName} ${p.actionedUser.lastName || ''}`.trim() 
                : (isAi ? 'AI System' : 'Unknown');

            return {
                id: p.id,
                amount: p.amount,
                status: p.status,
                isAiVerified: isAi,
                verifiedBy,
                studentName: p.student ? `${p.student.firstName} ${p.student.lastName || ''}`.trim() : 'Unknown',
                batchName: p.batch?.name || '-',
                businessName: p.business?.name || '-',
                createdAt: p.created_at,
                updatedAt: p.updatedAt,
                approveType
            };
        });

        // Filter the final data if a specific sub-approval type was requested
        let finalReportData = reportData;
        if (action === 'quick_approve') {
            finalReportData = reportData.filter(r => r.approveType === 'Quick Approve');
        } else if (action === 'discount_approve') {
            finalReportData = reportData.filter(r => r.approveType === 'Discount Approve');
        } else if (action === 'adjust_approve') {
            finalReportData = reportData.filter(r => r.approveType === 'Adjust Approve');
        } else if (action === 'upgrade_approve') {
            finalReportData = reportData.filter(r => r.approveType === 'Upgrade Approve');
        } else if (action === 'installment_approve') {
            finalReportData = reportData.filter(r => r.approveType === 'Installment Approve');
        }

        res.status(200).json({
            success: true,
            data: finalReportData,
            summary
        });
    } catch (error) {
        console.error("Staff stats report error:", error);
        res.status(500).json({ error: "Failed to generate staff stats report" });
    }
};

exports.syncLeadEnrollment = syncLeadEnrollment;
