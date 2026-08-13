const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getLast9Digits = (phone) => {
    if (!phone) return '';
    const basePhone = String(phone).split('_')[0];
    const cleaned = basePhone.replace(/[^0-9]/g, '');
    return cleaned.slice(-9);
};

// Helper: Get active staff IDs belonging to the business (and batch's business if batchId is provided)
const getActiveStaffIds = async (businessId, batchId) => {
    const businessStaff = await prisma.user.findMany({
        where: {
            role: { notIn: ['Student', 'USER', 'STUDENT'] }
        }
    });

    const activeStaffIds = new Set(businessStaff.map(u => u.id));
    return activeStaffIds;
};

// 🔥 HELPER FUNCTION (උඩටම ගත්තා හැමතැනම පාවිච්චි කරන්න ලේසි වෙන්න)
const buildStatsWhereClause = (businessId, batchId, startDate, endDate, baseConditions = {}) => {
    let whereClause = { ...baseConditions };

    if (batchId === 'UNASSIGNED') {
        whereClause.batchId = null;
    } else if (batchId && batchId !== '' && batchId !== 'ALL') {
        whereClause.batchId = parseInt(batchId);
    } else if (businessId && businessId !== '' && businessId !== 'ALL') {
        whereClause.OR = [
            { phone: { endsWith: `_BIZ_${businessId}` } },
            { phone: { endsWith: `_BIZ_${businessId}_AS` } },
            { phone: { contains: `_BIZ_${businessId}_BATCH_` } }
        ];
    }

    if (startDate && endDate) {
        whereClause.updatedAt = {
            gte: new Date(`${startDate}T00:00:00.000Z`),
            lte: new Date(`${endDate}T23:59:59.999Z`)
        };
    }
    return whereClause;
};

// ============================================================================
// 1. GET RETENTION DASHBOARD STATS (Cards 4ට සහ Chart එකට Data යැවීම)
// ============================================================================
exports.getRetentionDashboardStats = async (req, res) => {
    try {
        const { businessId, batchId } = req.query;

        // Helper එක පාවිච්චි කරලා filter කිරීම
        let whereClause = buildStatsWhereClause(businessId, batchId, null, null, { 
            campaignType: 'AFTER_SEMINAR',
            paymentIntention: { not: 'NOT_DECIDED' }
        });

        // 1. දැනට ඉන්න ළමයින්ගේ ගණන් ගැනීම (Top Cards 4 සඳහා)
        const leads = await prisma.lead.findMany({
            where: whereClause,
            select: { paymentIntention: true, enrollmentStatus: true }
        });

        let stats = {
            fullEnrolled: 0,
            monthlyEnrolled: 0,
            installmentEnrolled: 0,
            nonEnrolled: 0
        };

        leads.forEach(l => {
            if (l.enrollmentStatus === 'ENROLLED') {
                if (l.paymentIntention === 'FULL') stats.fullEnrolled++;
                else if (l.paymentIntention === 'MONTHLY') stats.monthlyEnrolled++;
                else if (l.paymentIntention === 'INSTALLMENT') stats.installmentEnrolled++;
            } else {
                stats.nonEnrolled++;
            }
        });

        // 2. මාසික Chart එකට Data ගැනීම (අපි අලුතෙන් හැදූ BatchMonthlyStats ටේබල් එකෙන්)
        let chartWhere = {};
        if (batchId === 'UNASSIGNED') {
            chartWhere.batchId = null;
        } else if (batchId && batchId !== '' && batchId !== 'ALL') {
            chartWhere.batchId = parseInt(batchId);
        } else if (businessId && businessId !== '' && businessId !== 'ALL') {
            const bizBatches = await prisma.batch.findMany({ where: { businessId: parseInt(businessId) }});
            chartWhere.batchId = { in: bizBatches.map(b => b.id) };
        }

        const monthlyHistory = await prisma.batchMonthlyStats.findMany({
            where: chartWhere,
            orderBy: { recordMonth: 'asc' } // පරණ මාසේ ඉඳන් අලුත් මාසෙට
        });

        res.status(200).json({
            success: true,
            currentStats: stats,
            chartData: monthlyHistory
        });

    } catch (error) {
        console.error("Retention Stats Error:", error);
        res.status(500).json({ error: "Failed to fetch retention stats." });
    }
};

// ============================================================================
// 2. GET RETENTION LEADS (Tabs 4 සඳහා - FULL, MONTHLY, INSTALLMENT, NON-ENROLLED)
// ============================================================================
exports.getRetentionLeads = async (req, res) => {
    try {
        const { businessId, batchId, tab } = req.query; // tab = 'FULL' | 'MONTHLY' | 'INSTALLMENT' | 'NON_ENROLLED'

        // Helper එක පාවිච්චි කරලා filter කිරීම
        let baseConditions = { 
            campaignType: 'AFTER_SEMINAR',
            // 🔥 FIX: Ensure ONLY Paid Campaign leads are shown
            paymentIntention: { not: 'NOT_DECIDED' }
        };
        
        // Tab එක අනුව Filter කිරීම
        if (tab === 'NON_ENROLLED') {
            baseConditions.enrollmentStatus = { in: ['NON_ENROLLED', 'PAYMENT_PROCESSING'] };
        } else {
            baseConditions.enrollmentStatus = 'ENROLLED';
            baseConditions.paymentIntention = tab; // FULL, MONTHLY, or INSTALLMENT
        }

        let whereClause = buildStatsWhereClause(businessId, batchId, null, null, baseConditions);
        const activeStaffIds = await getActiveStaffIds(businessId, batchId);

        const leads = await prisma.lead.findMany({
            where: whereClause,
            orderBy: { updatedAt: 'desc' },
            include: { assignedUser: { select: { firstName: true, lastName: true, businessType: true } } }
        });

        // Phone number එක පිරිසිදු කරලා, mismatch coordinators ලා filter කරලා යවනවා
        const cleanedLeads = leads.map(l => {
            const hasActiveAssignee = l.assignedTo && activeStaffIds.has(l.assignedTo);
            return {
                ...l,
                phone: l.phone.split('_')[0],
                assignedTo: hasActiveAssignee ? l.assignedTo : null,
                assignedUser: hasActiveAssignee ? l.assignedUser : null
            };
        });

        res.status(200).json({ success: true, leads: cleanedLeads });

    } catch (error) {
        console.error("Retention Leads Error:", error);
        res.status(500).json({ error: "Failed to fetch retention leads." });
    }
};

// ============================================================================
// ============================================================================
// 3. THE MONTHLY ENGINE (Cron Job) - හැම මාසෙම 1 වෙනිදා වැඩ කරන ලොජික් එක
// ============================================================================
exports.runMonthlyRetentionReset = async () => {
    try {
        const today = new Date();
        const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`; 
        const prevMonthStr = today.getMonth() === 0 
            ? `${today.getFullYear() - 1}-12` 
            : `${today.getFullYear()}-${String(today.getMonth()).padStart(2, '0')}`;

        console.log(`[RETENTION ENGINE] Starting monthly reset for ${currentMonthStr}...`);

        // 1. Batch ඔක්කොම ගන්නවා
        const allBatches = await prisma.batch.findMany({ select: { id: true } });

        for (const batch of allBatches) {
            // Find this month's (the new month we are entering today) group to see who has already paid
            const allGroups = await prisma.group.findMany({
                where: { batchId: batch.id },
                orderBy: { itemOrder: 'asc' }
            });
            const monthlyGroups = allGroups.filter(g => !g.name.toLowerCase().includes('full'));

            const currentMonthLong = today.toLocaleString('default', { month: 'long' }).toLowerCase();
            const currentMonthShort = today.toLocaleString('default', { month: 'short' }).toLowerCase();

            const currentMonthGroup = monthlyGroups.find(g => 
                g.name.toLowerCase().includes(currentMonthLong) || 
                g.name.toLowerCase().includes(currentMonthShort)
            );

            // Get the last 9 digits of all students who already have approved payments for the new month group
            let paidStudentPhones = [];
            if (currentMonthGroup) {
                const paymentsForNewMonth = await prisma.payment.findMany({
                    where: { 
                        batchId: batch.id,
                        groupId: currentMonthGroup.id,
                        status: 1
                    },
                    select: {
                        student: {
                            select: {
                                phone: true
                            }
                        }
                    }
                });
                paidStudentPhones = paymentsForNewMonth
                    .map(p => p.student?.phone ? getLast9Digits(p.student.phone) : '')
                    .filter(Boolean);
            }

            // ඒ Batch එකේ MONTHLY & INSTALLMENT Enrolled ළමයි ගන්නවා (PAID_CAMP Leads Pamanak)
            const activeLeads = await prisma.lead.findMany({
                where: {
                    batchId: batch.id,
                    campaignType: 'AFTER_SEMINAR',
                    enrollmentStatus: 'ENROLLED',
                    paymentIntention: { in: ['MONTHLY', 'INSTALLMENT'] }
                }
            });

            // Filter out leads who have already paid for the new month group in advance
            const leadsToReset = activeLeads.filter(l => {
                const cleanPhone = l.phone.split('_')[0];
                const leadLast9 = getLast9Digits(cleanPhone);
                return !paidStudentPhones.includes(leadLast9);
            });

            const fullLeadsCount = await prisma.lead.count({
                where: {
                    batchId: batch.id,
                    campaignType: 'AFTER_SEMINAR',
                    enrollmentStatus: 'ENROLLED',
                    paymentIntention: 'FULL'
                }
            });
            
            const monthlyCount = activeLeads.filter(l => l.paymentIntention === 'MONTHLY').length;
            const installCount = activeLeads.filter(l => l.paymentIntention === 'INSTALLMENT').length;

            // 2. BatchMonthlyStats ටේබල් එකට ගිය මාසේ අගයන් සේව් කරනවා (Chart එකට)
            await prisma.batchMonthlyStats.create({
                data: {
                    batchId: batch.id,
                    recordMonth: prevMonthStr,
                    totalEnrolled: fullLeadsCount + monthlyCount + installCount,
                    fullCount: fullLeadsCount,
                    monthlyCount: monthlyCount,
                    installCount: installCount,
                    droppedCount: 0, 
                    upgradedCount: 0 
                }
            });

            // 3. දැනටමත් NON_ENROLLED වෙලා ඉන්න හැමෝගෙමත් Call Status එකයි Phase එකයි අලුත් මාසෙට Reset කරනවා
            const nonEnrolledLeadsCount = await prisma.lead.count({
                where: {
                    batchId: batch.id,
                    campaignType: 'AFTER_SEMINAR',
                    enrollmentStatus: 'NON_ENROLLED'
                }
            });

            if (nonEnrolledLeadsCount > 0) {
                await prisma.lead.updateMany({
                    where: {
                        batchId: batch.id,
                        campaignType: 'AFTER_SEMINAR',
                        enrollmentStatus: 'NON_ENROLLED'
                    },
                    data: {
                        phase: 1,
                        callStatus: 'pending',
                        coordinationRound: { increment: 1 }
                    }
                });
                console.log(`[RETENTION ENGINE] Freshened ${nonEnrolledLeadsCount} existing NON_ENROLLED leads in Batch ${batch.id}.`);
            }

            // 4. MONTHLY & INSTALLMENT අයව NON_ENROLLED කරලා Call Phase 1 කරනවා (pay karapu nathi aya pamanak)
            if (leadsToReset.length > 0) {
                const leadIds = leadsToReset.map(l => l.id);
                await prisma.lead.updateMany({
                    where: { id: { in: leadIds } },
                    data: { 
                        enrollmentStatus: 'NON_ENROLLED',
                        phase: 1,               // ආයෙත් 1st Phase එකෙන් කෝල් කරන්න ඕනේ
                        callStatus: 'pending',  // අලුත් මාසෙට කෝල් එක තාම ගත්තේ නෑ
                        coordinationRound: { increment: 1 } // Round එක අලුත් මාසෙට අප්ඩේට් වෙනවා
                    }
                });
                console.log(`[RETENTION ENGINE] Reset ${leadsToReset.length} leads in Batch ${batch.id} to NON_ENROLLED.`);
            }
        }

        console.log(`[RETENTION ENGINE] Monthly reset completed successfully!`);

    } catch (error) {
        console.error("[RETENTION ENGINE ERROR]:", error);
    }
};

exports.manualTriggerMonthlyReset = async (req, res) => {
    await exports.runMonthlyRetentionReset();
    res.status(200).json({ message: "Monthly reset triggered successfully!" });
};

// ============================================================================
// 4. STATS DATA FETCHING FUNCTION
// ============================================================================
exports.getRetentionCampaignData = async (req, res) => {
    try {
        const { businessId, batchId, startDate, endDate, targetMonthName } = req.query;

        // 1. Fetch Monthly Groups & Payments
        let batchIdsToFetch = [];
        if (batchId && batchId !== '' && batchId !== 'ALL' && batchId !== 'UNASSIGNED') {
            batchIdsToFetch = [parseInt(batchId)];
        } else if (businessId && businessId !== '' && businessId !== 'ALL') {
            const bizBatches = await prisma.batch.findMany({ where: { businessId: parseInt(businessId) }, select: { id: true } });
            batchIdsToFetch = bizBatches.map(b => b.id);
        }

        const allGroups = await prisma.group.findMany({
            where: { batchId: { in: batchIdsToFetch } },
            orderBy: { itemOrder: 'asc' }
        });
        const monthlyGroupsRaw = allGroups.filter(g => !g.name.toLowerCase().includes('full'));

        const uniqueGroupNames = [...new Set(monthlyGroupsRaw.map(g => g.name))];
        const distinctMonthlyGroups = uniqueGroupNames.map(name => {
            const matchingGroups = monthlyGroupsRaw.filter(g => g.name === name);
            return {
                name: name,
                ids: matchingGroups.map(g => g.id)
            };
        });

        // Determine default active group name if not provided
        let activeGroupName = targetMonthName;
        if (!activeGroupName && distinctMonthlyGroups.length > 0) {
            const today = new Date();
            const currentMonthLong = today.toLocaleString('default', { month: 'long' }).toLowerCase();
            const currentMonthShort = today.toLocaleString('default', { month: 'short' }).toLowerCase();

            let activeGroup = distinctMonthlyGroups.find(g => 
                g.name.toLowerCase().includes(currentMonthLong) || 
                g.name.toLowerCase().includes(currentMonthShort)
            );
            if (!activeGroup) {
                activeGroup = distinctMonthlyGroups[distinctMonthlyGroups.length - 1];
            }
            activeGroupName = activeGroup ? activeGroup.name : null;
        }

        // Fetch ALL payments (approved=1, postpay=4, pending=0, installment=2)
        const payments = await prisma.payment.findMany({
            where: { batchId: { in: batchIdsToFetch }, status: { in: [0, 1, 2, 4] } },
            select: {
                id: true, payment_type: true, groupId: true, businessId: true, batchId: true, subjects: true, remark: true, status: true,
                student: { select: { id: true, firstName: true, lastName: true, phone: true, whatsapp: true } }
            }
        });

        // Load courses to map subject IDs to names
        const courses = await prisma.course.findMany({ select: { id: true, name: true } });
        const courseMap = {};
        courses.forEach(c => { courseMap[c.id] = c.name; });

        // 2. OVERALL ENROLLED CALCULATION (In CRM vs Not In CRM)
        const crmWhereClauseOverall = buildStatsWhereClause(businessId, batchId, null, null, {
            campaignType: 'AFTER_SEMINAR', source: { not: 'system' }
        });
        const allCrmLeads = await prisma.lead.findMany({
            where: crmWhereClauseOverall,
            select: { phone: true }
        });
        const crmLeadPhones = new Set(allCrmLeads.map(l => getLast9Digits(l.phone)));

        const paymentStudentsMap = new Map();
        payments.forEach(p => { if (p.student) paymentStudentsMap.set(p.student.id, p.student); });

        let inCrmCount = 0;
        let notInCrmCount = 0;
        let notInCrmStudents = [];

        paymentStudentsMap.forEach(student => {
            const studentLast9 = getLast9Digits(student.phone || student.whatsapp);
            if (studentLast9 && crmLeadPhones.has(studentLast9)) {
                inCrmCount++;
            } else {
                notInCrmCount++;
                notInCrmStudents.push({
                    id: student.id,
                    name: student.firstName ? `${student.firstName} ${student.lastName || ''}`.trim() : 'Unknown',
                    phone: student.phone,
                    whatsapp: student.whatsapp
                });
            }
        });

        // 3. Fetch CRM Leads (all leads for the batch)
        let whereClause = buildStatsWhereClause(businessId, batchId, startDate, endDate, { 
            source: { not: 'system' }
        });

        const activeStaffIds = await getActiveStaffIds(businessId, batchId);
        const leads = await prisma.lead.findMany({
            where: whereClause,
            include: { 
                assignedUser: { select: { firstName: true, lastName: true, businessType: true } },
                batch: { select: { name: true } }
            }
        });

        const activeLeads = leads.map(l => {
            let phase = l.phase || 1;
            if (phase > 2) phase = 2; // Map Phase 3, 4 etc to Phase 2
            
            if (l.assignedTo && !activeStaffIds.has(l.assignedTo)) {
                return { ...l, phase, assignedTo: null, assignedUser: null };
            }
            return { ...l, phase };
        });

        // 4. Build payment-derived data for each lead
        const leadsWithGroupData = [];
        
        // Pre-calculate active group index
        let activeGroupIndex = distinctMonthlyGroups.findIndex(g => g.name.toUpperCase() === activeGroupName.toUpperCase());
        if (activeGroupIndex === -1) activeGroupIndex = distinctMonthlyGroups.length - 1;

        activeLeads.forEach(l => {
            const cleanPhone = l.phone.split('_')[0];
            const leadLast9 = getLast9Digits(cleanPhone);
            const studentPayments = payments.filter(p => {
                if (!p.student || (!p.student.phone && !p.student.whatsapp)) return false;
                const studentLast9 = getLast9Digits(p.student.phone || p.student.whatsapp);
                return leadLast9 !== '' && leadLast9 === studentLast9;
            });

            // If no payment records found, this student hasn't paid/enrolled yet.
            // For the Retention (Paid) campaign, we only want students who have enrolled at least once.
            if (studentPayments.length === 0) {
                return;
            }

            // Extract all subjects this student has ever paid for
            let baseSubjects = new Set();
            studentPayments.forEach(p => {
                if (p.subjects) {
                    try {
                        const subs = JSON.parse(p.subjects);
                        subs.forEach(item => {
                            let subName = null;
                            if (typeof item === 'object' && item.id && courseMap[parseInt(item.id)]) subName = courseMap[parseInt(item.id)];
                            else if (typeof item === 'string' && isNaN(parseInt(item))) subName = item.trim().toUpperCase();
                            else if (!isNaN(parseInt(item)) && courseMap[parseInt(item)]) subName = courseMap[parseInt(item)];
                            else if (typeof item === 'number' && courseMap[item]) subName = courseMap[item];
                            
                            if (subName) baseSubjects.add(subName);
                        });
                    } catch(e) {}
                }
            });

            // Fallback if no subjects found in payments
            if (baseSubjects.size === 0) {
                if (l.assignedSubjects && l.assignedSubjects.length > 0) {
                    l.assignedSubjects.forEach(s => baseSubjects.add(s));
                } else {
                    baseSubjects.add('General');
                }
            }

            // Find the EARLIEST group (month) this student first enrolled in
            let earliestGroupIndex = distinctMonthlyGroups.length;
            studentPayments.forEach(p => {
                if (p.payment_type === 3 || p.payment_type === 2) {
                    // Full payment & Installment covers from the beginning
                    earliestGroupIndex = 0;
                } else if (p.groupId) {
                    let gIndex = distinctMonthlyGroups.findIndex(g => g.ids.includes(p.groupId));
                    if (gIndex !== -1 && gIndex < earliestGroupIndex) {
                        earliestGroupIndex = gIndex;
                    }
                }
            });

            if (earliestGroupIndex === distinctMonthlyGroups.length) {
                earliestGroupIndex = 0; 
            }

            // FILTER: If the student's first payment is AFTER the active campaign month, they shouldn't be evaluated in this month
            if (earliestGroupIndex > activeGroupIndex) {
                return; 
            }

            // Build payment history from first enrolled month to active month
            let paymentHistory = {};
            
            // Generate paymentHistory for all months from earliestGroupIndex to active month
            let startHistoryIndex = earliestGroupIndex;
            if (startHistoryIndex > activeGroupIndex || startHistoryIndex >= distinctMonthlyGroups.length) {
                startHistoryIndex = 0;
            }
            
            baseSubjects.forEach(subjectName => {
                paymentHistory[subjectName] = {};
                for (let i = startHistoryIndex; i <= activeGroupIndex; i++) {
                    const group = distinctMonthlyGroups[i];
                    if (!group) continue;
                    let status = 'NOT PAID';
                        
                    let relevantPayments = studentPayments.filter(p => {
                        let hasSub = false;
                        if (p.subjects) {
                            try {
                                const subs = JSON.parse(p.subjects);
                                hasSub = subs.some(item => {
                                    let sName = null;
                                    if (typeof item === 'object' && item.id) sName = courseMap[parseInt(item.id)];
                                    else if (typeof item === 'string' && isNaN(parseInt(item))) sName = item.trim().toUpperCase();
                                    else if (!isNaN(parseInt(item))) sName = courseMap[parseInt(item)];
                                    else if (typeof item === 'number' && courseMap[item]) sName = courseMap[item];
                                    return sName === subjectName;
                                });
                            } catch(e) {}
                        } else {
                            // If payment has no subjects, assume it covers all their base subjects
                            hasSub = true;
                        }
                        if (hasSub && (p.payment_type === 3 || p.payment_type === 2 || group.ids.includes(p.groupId))) {
                            return true;
                        }
                        return false;
                    });

                    if (relevantPayments.some(p => [1, 4].includes(p.status))) {
                        status = 'PAID';
                    } else if (relevantPayments.some(p => p.status === 0)) {
                        status = 'PROCESSING';
                    }
                    
                    paymentHistory[subjectName][group.name] = status;
                }
            });

            // ---------------------------------------------------------
            // MONTH-OVER-MONTH DROP EVALUATION & 2+ MONTH DROPPED LOGIC
            // ---------------------------------------------------------
            let prevGroupIndex = activeGroupIndex - 1;
            let prevGroup = prevGroupIndex >= 0 ? distinctMonthlyGroups[prevGroupIndex] : null;
            let activeGroup = distinctMonthlyGroups[activeGroupIndex];

            let prevGroupPaidSubjects = [];
            let activeGroupPaidSubjects = [];
            let firstGroupPaidSubjects = [];
            let droppedSubjectsDetails = [];
            let newlyDroppedSubjects = [];
            let isDroppedTwoMonthsPlus = false;

            let firstGroupIndex = earliestGroupIndex;
            if (firstGroupIndex >= distinctMonthlyGroups.length) firstGroupIndex = 0;
            let firstGroup = distinctMonthlyGroups[firstGroupIndex];

            if (baseSubjects.size > 0 && activeGroupIndex >= 0) {
                baseSubjects.forEach(subjectName => {
                    const activeStatus = paymentHistory[subjectName]?.[activeGroup?.name];
                    if (activeStatus === 'PAID' || activeStatus === 'PROCESSING') {
                        activeGroupPaidSubjects.push(subjectName);
                    }

                    if (prevGroup) {
                        const prevStatus = paymentHistory[subjectName]?.[prevGroup.name];
                        if (prevStatus === 'PAID' || prevStatus === 'PROCESSING') {
                            prevGroupPaidSubjects.push(subjectName);
                        }
                    }

                    if (firstGroup) {
                        const firstStatus = paymentHistory[subjectName]?.[firstGroup.name];
                        if (firstStatus === 'PAID' || firstStatus === 'PROCESSING') {
                            firstGroupPaidSubjects.push(subjectName);
                        }
                    }

                    // Check consecutive unpaid months leading up to active month
                    let consecutiveUnpaidCount = 0;
                    for (let i = activeGroupIndex; i >= 0; i--) {
                        const g = distinctMonthlyGroups[i];
                        if (!g) continue;
                        const st = paymentHistory[subjectName]?.[g.name];
                        if (st === 'NOT PAID' || st === 'PROCESSING' || !st) {
                            consecutiveUnpaidCount++;
                        } else {
                            break; // Stop counting if paid in a month
                        }
                    }

                    // Check if subject was paid at least once in history before the unpaid streak
                    let hadPriorPayment = false;
                    for (let i = 0; i < activeGroupIndex; i++) {
                        const g = distinctMonthlyGroups[i];
                        if (g && paymentHistory[subjectName]?.[g.name] === 'PAID') {
                            hadPriorPayment = true;
                            break;
                        }
                    }

                    if (hadPriorPayment && consecutiveUnpaidCount >= 2) {
                        isDroppedTwoMonthsPlus = true;
                        droppedSubjectsDetails.push({ subject: subjectName, unpaidMonths: consecutiveUnpaidCount });
                    }

                    if (prevGroupPaidSubjects.includes(subjectName) && !activeGroupPaidSubjects.includes(subjectName)) {
                        newlyDroppedSubjects.push(subjectName);
                    }
                });
            }

            // Determine Payment Type & Intention
            const hasApprovedFull = studentPayments.some(p => p.payment_type === 3 && [1, 4].includes(p.status));
            const hasApprovedInstallment = studentPayments.some(p => p.payment_type === 2 && [1, 4].includes(p.status));
            const hasApprovedMonthly = studentPayments.some(p => p.payment_type === 1 && [1, 4].includes(p.status));

            const hasPendingFull = studentPayments.some(p => p.payment_type === 3 && p.status === 0);
            const hasPendingInstallment = studentPayments.some(p => p.payment_type === 2 && p.status === 0);
            const hasPendingMonthly = studentPayments.some(p => p.payment_type === 1 && p.status === 0);

            if (hasApprovedFull || hasPendingFull) l.paymentIntention = 'FULL';
            else if (hasApprovedInstallment || hasPendingInstallment) l.paymentIntention = 'INSTALLMENT';
            else if (hasApprovedMonthly || hasPendingMonthly) l.paymentIntention = 'MONTHLY';

            // Determine Enrollment Status
            let isEnrolled = false;
            let isNonEnrolled = false;

            if (hasApprovedFull) {
                isEnrolled = true;
            } else if (activeGroupIndex === 0) {
                // First Month Rule: Cannot be non-enrolled
                isEnrolled = true;
                isNonEnrolled = false;
            } else {
                // Month > 1 Rule
                if (activeGroupPaidSubjects.length < prevGroupPaidSubjects.length) {
                    isNonEnrolled = true;
                } else if (prevGroupPaidSubjects.length === 0 && activeGroupPaidSubjects.length === 0) {
                    isNonEnrolled = true;
                } else {
                    isEnrolled = true;
                }
            }

            l.enrollmentStatus = isNonEnrolled ? 'NON_ENROLLED' : 'ENROLLED';
            const isDroppedOverall = firstGroupPaidSubjects.length > activeGroupPaidSubjects.length;
            const isUpgraded = studentPayments.some(p => p.remark && p.remark.includes('[UPGRADE]'));

            // Add first enrolled month name for frontend display
            const firstEnrolledMonthName = earliestGroupIndex < distinctMonthlyGroups.length 
                ? distinctMonthlyGroups[earliestGroupIndex].name 
                : null;
            
            leadsWithGroupData.push({ 
                ...l, 
                registeredUser: studentPayments[0]?.student,
                phase: l.paidPhase || l.phase || 1,
                callStatus: l.paidCallStatus || 'pending',
                coordinationRound: l.paidRound || 1,
                feedback: l.paidFeedback || '',
                callMethod: l.paidCallMethod || null,
                callAttempt: l.paidCallAttempt || 1,
                enrolledSubjects: Array.from(baseSubjects), 
                paymentHistory,
                isUpgraded,
                firstEnrolledMonthName,
                enrolledGroupIds: studentPayments.filter(p => [1, 4].includes(p.status) && p.groupId).map(p => p.groupId),
                isDroppedTwoMonthsPlus,
                isDroppedOverall,
                droppedSubjectsDetails,
                newlyDroppedSubjects,
                prevGroupPaidSubjects,
                activeGroupPaidSubjects
            });
        });

        // 5. Calculate Retention Stats for the specific month selected
        let prevMonthEnrolled = 0;
        let thisMonthRenewed = 0;
        let processingCount = 0;
        
        leadsWithGroupData.forEach(l => {
            if (l.paymentIntention !== 'NOT_DECIDED') {
                prevMonthEnrolled++;
                if (l.enrollmentStatus === 'ENROLLED') {
                    thisMonthRenewed++;
                }
                if (l.isProcessing) {
                    processingCount++;
                }
            }
        });

        const thisMonthDropped = prevMonthEnrolled - thisMonthRenewed;

        res.status(200).json({
            leads: leadsWithGroupData,
            monthlyGroups: distinctMonthlyGroups,
            defaultActiveGroupName: activeGroupName,
            overallEnrolledStats: {
                inCrmCount,
                notInCrmCount,
                notInCrmStudents
            },
            stats: {
                prevMonthEnrolled,
                thisMonthRenewed,
                thisMonthDropped: thisMonthDropped > 0 ? thisMonthDropped : 0,
                processingCount
            }
        });

    } catch (error) {
        console.error("Retention Data Error:", error);
        res.status(500).json({ error: "Failed to fetch retention campaign data" });
    }
};