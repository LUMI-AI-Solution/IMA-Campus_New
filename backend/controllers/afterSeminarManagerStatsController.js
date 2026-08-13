const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper: Get all active staff IDs (No strict business filtering to prevent breaking cross-business assignments)
const getActiveStaffIds = async (businessId, batchId) => {
    const businessStaff = await prisma.user.findMany({
        where: {
            role: { notIn: ['Student', 'USER', 'STUDENT'] }
        }
    });

    const activeStaffIds = new Set(businessStaff.map(u => u.id));
    return activeStaffIds;
};

// Helper: Get verified student phone numbers (last 9 digits) for a business/batch
const getVerifiedPhones = async (businessId, batchId) => {
    const paymentWhere = { status: { in: [1, 4] } };
    if (batchId && batchId !== 'ALL') {
        paymentWhere.batchId = parseInt(batchId);
    } else if (businessId && businessId !== 'ALL') {
        paymentWhere.businessId = parseInt(businessId);
    }

    const verifiedPayments = await prisma.payment.findMany({
        where: paymentWhere,
        include: { student: true }
    });

    const verifiedStudentNics = [];
    const verifiedStudentPhones = [];
    verifiedPayments.forEach(p => {
        if (p.student) {
            if (p.student.nic) verifiedStudentNics.push(p.student.nic.trim());
            if (p.student.phone) verifiedStudentPhones.push(p.student.phone);
            if (p.student.whatsapp) verifiedStudentPhones.push(p.student.whatsapp);
            if (p.student.optionalPhone) verifiedStudentPhones.push(p.student.optionalPhone);
        }
    });

    const relatedStudents = await prisma.user.findMany({
        where: {
            role: { in: ['Student', 'USER', 'user', 'student', 'STUDENT'] },
            OR: [
                { nic: { in: verifiedStudentNics.filter(Boolean) } },
                { phone: { in: verifiedStudentPhones.filter(Boolean) } },
                { whatsapp: { in: verifiedStudentPhones.filter(Boolean) } },
                { optionalPhone: { in: verifiedStudentPhones.filter(Boolean) } }
            ]
        }
    });

    const studentIdToRelatedPhonesMap = {};
    verifiedPayments.forEach(p => {
        if (!p.student) return;
        const stu = p.student;
        const sid = stu.id;

        const matches = relatedStudents.filter(other => {
            if (other.id === sid) return true;
            if (stu.nic && other.nic && stu.nic.trim() === other.nic.trim()) return true;
            const stuNumSet = new Set([stu.phone, stu.whatsapp, stu.optionalPhone].filter(Boolean));
            const otherNumSet = new Set([other.phone, other.whatsapp, other.optionalPhone].filter(Boolean));
            for (let num of stuNumSet) {
                if (otherNumSet.has(num)) return true;
            }
            return false;
        });

        const phoneSuffixes = new Set();
        matches.forEach(m => {
            [m.phone, m.whatsapp, m.optionalPhone].forEach(ph => {
                if (!ph) return;
                const cleanPh = ph.replace(/[^0-9]/g, '');
                if (cleanPh.length >= 7) {
                    phoneSuffixes.add(cleanPh.slice(-7));
                }
            });
        });

        studentIdToRelatedPhonesMap[stu.id] = phoneSuffixes;
    });

    const verifiedPhones = new Set();
    const phoneSuffixToStudentId = {};
    verifiedPayments.forEach(p => {
        if (p.student) {
            const relatedSuffixes = studentIdToRelatedPhonesMap[p.student.id] || new Set();
            relatedSuffixes.forEach(suffix => {
                verifiedPhones.add(suffix);
                phoneSuffixToStudentId[suffix] = p.student.id;
            });
        }
    });

    verifiedPhones.studentIdMap = phoneSuffixToStudentId;
    return verifiedPhones;
};


// 🔥 Helper: Get primary enrolled lead IDs to prevent duplicates across campaigns 🔥
const getPrimaryEnrolledLeadIds = async (businessId, batchId, verifiedPhones) => {
    const whereClause = buildStatsWhereClause(businessId, batchId, null, null, { campaignType: { in: ['AFTER_SEMINAR', 'FREE_SEMINAR'] } });
    const allLeads = await prisma.lead.findMany({
        where: whereClause,
        select: { id: true, phone: true, createdAt: true }
    });

    const phoneSuffixToStudentId = verifiedPhones.studentIdMap || {};
    const studentToLeads = {};
    allLeads.forEach(l => {
        const cleanPhone = l.phone ? l.phone.split('_')[0].replace(/[^0-9]/g, '') : '';
        if (cleanPhone.length >= 7 && verifiedPhones.has(cleanPhone.slice(-7))) {
            const studentId = phoneSuffixToStudentId[cleanPhone.slice(-7)];
            if (studentId) {
                if (!studentToLeads[studentId]) studentToLeads[studentId] = [];
                studentToLeads[studentId].push(l);
            }
        }
    });

    const primaryLeadIds = new Set();
    Object.values(studentToLeads).forEach(group => {
        group.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Latest lead gets the enrollment
        primaryLeadIds.add(group[0].id);
    });

    return primaryLeadIds;
};

// 🔥 STRICT HELPER: Fixed BIZ_ and BATCH_ string format to prevent missing leads 🔥
const buildStatsWhereClause = (businessId, batchId, startDate, endDate, baseConditions = {}) => {
    let whereClause = { ...baseConditions };

    const hasBatch = batchId && batchId !== '' && batchId !== 'ALL' && batchId !== 'undefined' && batchId !== 'null';
    const hasBiz = businessId && businessId !== '' && businessId !== 'ALL' && businessId !== 'undefined' && businessId !== 'null';

    if (batchId === 'UNASSIGNED') {
        whereClause.batchId = null;
    } else if (hasBatch) {
        const bId = parseInt(batchId);
        const batchOrConditions = [
            { batchId: bId },
            { phone: { endsWith: `_BATCH_${bId}` } },
            { phone: { contains: `_BATCH_${bId}_` } }
        ];

        if (hasBiz) {
            const bizId = parseInt(businessId);
            whereClause.AND = [
                { OR: batchOrConditions },
                {
                    OR: [
                        { phone: { endsWith: `_BIZ_${bizId}` } },
                        { phone: { endsWith: `_BIZ_${bizId}_AS` } },
                        { phone: { contains: `_BIZ_${bizId}_` } }
                    ]
                }
            ];
        } else {
            whereClause.OR = batchOrConditions;
        }
    } else if (hasBiz) {
        const bizId = parseInt(businessId);
        whereClause.OR = [
            { phone: { endsWith: `_BIZ_${bizId}` } },
            { phone: { endsWith: `_BIZ_${bizId}_AS` } },
            { phone: { contains: `_BIZ_${bizId}_` } }
        ];
    }

    if (startDate && endDate) {
        const isExactStart = startDate.includes('T');
        const isExactEnd = endDate.includes('T');

        whereClause.updatedAt = {
            gte: isExactStart ? new Date(startDate) : new Date(`${startDate}T00:00:00.000Z`),
            lte: isExactEnd ? new Date(endDate) : new Date(`${endDate}T23:59:59.999Z`)
        };
    }
    return whereClause;
};

// ==========================================
// 1. OVERALL PROGRESS STATS
// ==========================================
// ==========================================
// 1. OVERALL PROGRESS STATS (REVISED FOR 100% VERIFIED DATA)
// ==========================================
exports.getManagerDashboardStats = async (req, res) => {
    try {
        const { businessId, batchId, startDate, endDate } = req.query;

        let courseWhere = {};
        if (batchId && batchId !== 'ALL' && batchId !== 'undefined' && batchId !== 'null') {
            const batchGroups = await prisma.group.findMany({ where: { batchId: parseInt(batchId) }, select: { id: true } });
            courseWhere.groupId = { in: batchGroups.map(g => g.id) };
        } else if (businessId && businessId !== 'ALL' && businessId !== 'undefined' && businessId !== 'null') {
            const bizBatches = await prisma.batch.findMany({ where: { businessId: parseInt(businessId) }, select: { id: true } });
            const bizGroups = await prisma.group.findMany({ where: { batchId: { in: bizBatches.map(b => b.id) } }, select: { id: true } });
            courseWhere.groupId = { in: bizGroups.map(g => g.id) };
        }

        const activeStaffIds = await getActiveStaffIds(businessId, batchId);
        const whereClause = buildStatsWhereClause(businessId, batchId, startDate, endDate, { campaignType: { in: ['AFTER_SEMINAR', 'FREE_SEMINAR'] } });

        // 🔥 Exclude cold bridge transfer leads from campaign overview statistics 🔥
        whereClause.NOT = {
            source: 'bridge_transfer',
            lastMessage: null
        };

        const leads = await prisma.lead.findMany({
            where: whereClause,
            include: { assignedUser: { select: { firstName: true, lastName: true, businessType: true, role: true } } }
        });

        // 🔥 1. PAYMENT VERIFICATION (Get all verified phones first) 🔥
        const paymentWhere = { status: { in: [1, 4] } };
        if (batchId && batchId !== 'ALL' && batchId !== 'undefined' && batchId !== 'null') paymentWhere.batchId = parseInt(batchId);
        else if (businessId && businessId !== 'ALL' && businessId !== 'undefined' && businessId !== 'null') paymentWhere.businessId = parseInt(businessId);

        const verifiedPaymentsRaw = await prisma.payment.findMany({
            where: paymentWhere,
            include: { student: true, batch: true }
        });

        const verifiedPayments = verifiedPaymentsRaw.filter(p => {
            if (p.amount === 0 || (p.remark && p.remark.toUpperCase().includes('FREE'))) return false;
            return true;
        });

        // Gather all unique NICs and phone numbers of students in verifiedPayments to find related records
        const verifiedStudentNics = [];
        const verifiedStudentPhones = [];
        verifiedPayments.forEach(p => {
            if (p.student) {
                if (p.student.nic) verifiedStudentNics.push(p.student.nic.trim());
                if (p.student.phone) verifiedStudentPhones.push(p.student.phone);
                if (p.student.whatsapp) verifiedStudentPhones.push(p.student.whatsapp);
                if (p.student.optionalPhone) verifiedStudentPhones.push(p.student.optionalPhone);
            }
        });

        const relatedStudents = await prisma.user.findMany({
            where: {
                role: { in: ['Student', 'USER', 'user', 'student', 'STUDENT'] },
                OR: [
                    { nic: { in: verifiedStudentNics.filter(Boolean) } },
                    { phone: { in: verifiedStudentPhones.filter(Boolean) } },
                    { whatsapp: { in: verifiedStudentPhones.filter(Boolean) } },
                    { optionalPhone: { in: verifiedStudentPhones.filter(Boolean) } }
                ]
            }
        });

        // Map each student.id in verifiedPayments to all related phone suffixes
        const studentIdToRelatedPhonesMap = {};
        verifiedPayments.forEach(p => {
            if (!p.student) return;
            const stu = p.student;
            const sid = stu.id;

            const matches = relatedStudents.filter(other => {
                if (other.id === sid) return true;
                if (stu.nic && other.nic && stu.nic.trim() === other.nic.trim()) return true;
                const stuNumSet = new Set([stu.phone, stu.whatsapp, stu.optionalPhone].filter(Boolean));
                const otherNumSet = new Set([other.phone, other.whatsapp, other.optionalPhone].filter(Boolean));
                for (let num of stuNumSet) {
                    if (otherNumSet.has(num)) return true;
                }
                return false;
            });

            const phoneSuffixes = new Set();
            matches.forEach(m => {
                [m.phone, m.whatsapp, m.optionalPhone].forEach(ph => {
                    if (!ph) return;
                    const cleanPh = ph.replace(/[^0-9]/g, '');
                    if (cleanPh.length >= 7) {
                        phoneSuffixes.add(cleanPh.slice(-7));
                    }
                });
            });

            studentIdToRelatedPhonesMap[stu.id] = phoneSuffixes;
        });

        const verifiedPhones = new Set();
        const studentIdMap = {};
        verifiedPayments.forEach(p => {
            if (p.student) {
                const relatedSuffixes = studentIdToRelatedPhonesMap[p.student.id] || new Set();
                relatedSuffixes.forEach(suffix => {
                    verifiedPhones.add(suffix);
                    studentIdMap[suffix] = p.student.id;
                });
            }
        });
        verifiedPhones.studentIdMap = studentIdMap;

        // Clean and index CRM leads by clean phone suffix (last 7 digits)
        const cleanPhoneToLeadMap = {};
        leads.forEach(l => {
            if (!l.phone) return;
            const cleanLeadPhone = l.phone.split('_')[0].replace(/[^0-9]/g, '');
            if (cleanLeadPhone.length >= 7) {
                cleanPhoneToLeadMap[cleanLeadPhone.slice(-7)] = l;
            }
        });

        // Find verified students who are not in the leads list
        const verifiedStudentsNotInCrm = [];
        const seenStudentPhones = new Set();

        verifiedPayments.forEach(p => {
            if (!p.student) return;
            const stuPhone = (p.student.phone || p.student.whatsapp || '').replace(/[^0-9]/g, '');
            if (stuPhone.length < 7) return;
            const key = stuPhone.slice(-7);

            if (seenStudentPhones.has(key)) return;
            seenStudentPhones.add(key);

            // Check if any of their related phone suffixes has a lead in CRM
            const relatedSuffixes = studentIdToRelatedPhonesMap[p.student.id] || new Set();
            let hasCrmLead = false;
            for (let suffix of relatedSuffixes) {
                if (cleanPhoneToLeadMap[suffix]) {
                    hasCrmLead = true;
                    break;
                }
            }

            if (!hasCrmLead) {
                verifiedStudentsNotInCrm.push({
                    studentId: p.student.id,
                    name: `${p.student.firstName} ${p.student.lastName}`,
                    phone: p.student.phone || p.student.whatsapp || 'N/A',
                    batchName: p.batch?.name || 'N/A',
                    amountPaid: p.amount
                });
            }
        });

        // 2. Combined Stats & Advanced Staff Breakdown
        let stats = { totalLeads: leads.length, assignedLeads: 0, unassignedLeads: 0, openSemLeads: 0, newInqLeads: 0, bridgeLeads: 0 };
        let staffMap = {};
        
        let totalContacted = 0;
        let totalAnswered = 0;
        let totalNoAnswer = 0;
        let totalReject = 0;
        let totalActualPending = 0;
        let totalDirectPaid = 0;
        let totalEnrolled = 0;
        let totalDelayed = 0;

        const primaryEnrolledLeadIds = await getPrimaryEnrolledLeadIds(businessId, batchId, verifiedPhones);

        const allCourses = await prisma.course.findMany({ select: { id: true, name: true } });
        const globalCourseMap = {};
        allCourses.forEach(c => globalCourseMap[c.id] = c.name.trim().toUpperCase());

        const realCourses = await prisma.course.findMany({ where: courseWhere, select: { id: true, name: true } });
        const subjectAggregates = {};
        realCourses.forEach(c => {
            const upName = c.name.trim().toUpperCase();
            subjectAggregates[upName] = { id: c.id, subject: c.name, full: 0, monthly: 0, installment: 0, totalEnrolled: 0 };
        });

        // Lead loop
        for (const l of leads) {
            if (l.source === 'bridge_transfer') stats.bridgeLeads++;
            else if (l.inquiryType === 'NEW_INQ') stats.newInqLeads++;
            else stats.openSemLeads++;

            if (l.assignedTo) {
                stats.assignedLeads++;
                const staffName = l.assignedUser ? `${l.assignedUser.firstName} ${l.assignedUser.lastName}`.trim() : `Staff #${l.assignedTo}`;
                
                if (!staffMap[staffName]) {
                    staffMap[staffName] = {
                        name: staffName,
                        businessType: l.assignedUser?.businessType || 'OTHER',
                        role: l.assignedUser?.role || 'COORDINATOR',
                        overall: {
                            assigned: 0, contacted: 0, answered: 0, noAnswer: 0, reject: 0, pending: 0, delayed: 0, enrolled: 0, full: 0, upgrade: 0, monthly: 0, installment: 0, directPaid: 0, r1HistoricalDelays: 0, r2HistoricalDelays: 0
                        },
                        rounds: {
                            1: { assigned: 0, contacted: 0, answered: 0, noAnswer: 0, reject: 0, pending: 0, delayed: 0 },
                            2: { assigned: 0, contacted: 0, answered: 0, noAnswer: 0, reject: 0, pending: 0, delayed: 0 },
                            NON_ENROLLED: { assigned: 0, contacted: 0, answered: 0, noAnswer: 0, reject: 0, pending: 0, delayed: 0 },
                            PAID: { assigned: 0, contacted: 0, answered: 0, noAnswer: 0, reject: 0, pending: 0 }
                        }
                    };
                }

                // Determine dynamic status fields based on whether it is Open Sem or New Inq
                let round = 1;
                let cStatus = 'pending';
                let fb = '';
                
                if (l.inquiryType === 'NEW_INQ') {
                    round = l.newInqRound || 1;
                    cStatus = (l.newInqCallStatus || 'pending').toLowerCase();
                    fb = (l.newInqFeedback || '').toLowerCase();
                } else {
                    round = l.openSemRound || 1;
                    cStatus = (l.openSemCallStatus || 'pending').toLowerCase();
                    fb = (l.openSemFeedback || '').toLowerCase();
                }
                
                // If enrolled in real DB
                let isEnrolled = false;
                if (primaryEnrolledLeadIds.has(l.id)) {
                    isEnrolled = true;
                    round = 'PAID';
                }

                // Call Logic Evaluation
                const isContacted = ['answered', 'no answer', 'reject', 'call back'].includes(cStatus);
                const isAnswered = cStatus === 'answered' || isEnrolled;
                const isNoAnswer = cStatus === 'no answer';
                const isReject = cStatus === 'reject';
                const isDirectPaid = fb.includes('direct paid');

                let isDelayed = false;
                if (!isEnrolled && !isAnswered && !isReject) {
                    if (round === 1 && l.r1DelayedDays > 0) isDelayed = true;
                    if (round === 2 && l.r2DelayedDays > 0) isDelayed = true;
                }

                // Global Aggregates
                if (isContacted) totalContacted++;
                if (isAnswered) totalAnswered++;
                if (isNoAnswer) totalNoAnswer++;
                if (isReject) totalReject++;
                if (isDirectPaid) totalDirectPaid++;
                if (isDelayed) totalDelayed++;
                if (isEnrolled) totalEnrolled++;
                if (!isContacted && !isEnrolled && !isReject && cStatus === 'pending') totalActualPending++;

                // Overall Stats Update
                let bucket = 'pending';
                if (isReject) bucket = 'reject';
                else if (isNoAnswer) bucket = 'noAnswer';
                else if (isAnswered || isEnrolled || (isContacted && !isNoAnswer && !isReject)) bucket = 'answered';
                else bucket = 'pending';

                staffMap[staffName].overall.assigned++;
                staffMap[staffName].overall[bucket]++;
                if (isDelayed) staffMap[staffName].overall.delayed++;
                if (isContacted) staffMap[staffName].overall.contacted++;
                if (isDirectPaid) staffMap[staffName].overall.directPaid++;
                if (isEnrolled) {
                    staffMap[staffName].overall.enrolled++;
                    if (l.paymentIntention === 'FULL') staffMap[staffName].overall.full++;
                    else if (l.paymentIntention === 'UPGRADE') staffMap[staffName].overall.upgrade++;
                    else if (l.paymentIntention === 'MONTHLY') staffMap[staffName].overall.monthly++;
                    else if (l.paymentIntention === 'INSTALLMENTS' || l.paymentIntention === 'INSTALLMENT') staffMap[staffName].overall.installment++;
                }

                if (l.r1DelayedDays > 0) staffMap[staffName].overall.r1HistoricalDelays++;
                if (l.r2DelayedDays > 0) staffMap[staffName].overall.r2HistoricalDelays++;

                // Round-wise Stats Update
                let targetRound = 1;
                if (isEnrolled) targetRound = 'PAID';
                else if (round === 'NON_ENROLLED' || round >= 3) targetRound = 'NON_ENROLLED';
                else if (round === 2) targetRound = 2;
                else targetRound = 1;

                staffMap[staffName].rounds[targetRound].assigned++;
                staffMap[staffName].rounds[targetRound][bucket]++;
                if (isDelayed) staffMap[staffName].rounds[targetRound].delayed++;
                
            } else {
                stats.unassignedLeads++;
            }
        }

        // 3. Populate Mixer Data (Using real verified payments only)
        const paymentDataRaw = await prisma.payment.findMany({
            where: paymentWhere,
            select: { studentId: true, payment_type: true, subjects: true, amount: true, remark: true }
        });

        const paymentData = paymentDataRaw.filter(p => {
            if (p.amount === 0 || (p.remark && p.remark.toUpperCase().includes('FREE'))) return false;
            return true;
        });

        const studentPaymentMap = {};
        paymentData.forEach(p => {
            if (!p.studentId) return;
            if (!studentPaymentMap[p.studentId]) studentPaymentMap[p.studentId] = { typeStr: 'MONTHLY', typeValue: 1, subjects: new Set() };

            const pType = parseInt(p.payment_type);
            if (pType === 3) { studentPaymentMap[p.studentId].typeStr = 'FULL'; studentPaymentMap[p.studentId].typeValue = 3; }
            else if (pType === 2 && studentPaymentMap[p.studentId].typeValue < 3) { studentPaymentMap[p.studentId].typeStr = 'INSTALLMENT'; studentPaymentMap[p.studentId].typeValue = 2; }

            if (p.subjects) {
                try {
                    const subs = typeof p.subjects === 'string' ? JSON.parse(p.subjects) : p.subjects;
                    subs.forEach(item => {
                        const sName = globalCourseMap[parseInt(item.id || item)];
                        if (sName) studentPaymentMap[p.studentId].subjects.add(sName);
                    });
                } catch (e) { }
            }
        });

        let realMixerData = [];
        let realFullCount = 0; let realMonthlyCount = 0; let realInstallCount = 0; let realTotalEnrolled = 0;

        Object.values(studentPaymentMap).forEach(studentData => {
            const subArray = Array.from(studentData.subjects).filter(sub => subjectAggregates[sub]);
            if (subArray.length === 0) return;

            realTotalEnrolled++;
            if (studentData.typeStr === 'FULL') realFullCount++;
            else if (studentData.typeStr === 'MONTHLY') realMonthlyCount++;
            else if (studentData.typeStr === 'INSTALLMENT') realInstallCount++;

            subArray.forEach(sub => {
                if (studentData.typeStr === 'FULL') subjectAggregates[sub].full++;
                else if (studentData.typeStr === 'MONTHLY') subjectAggregates[sub].monthly++;
                else if (studentData.typeStr === 'INSTALLMENT') subjectAggregates[sub].installment++;
                subjectAggregates[sub].totalEnrolled++;
            });
            realMixerData.push({ paymentIntention: studentData.typeStr, subjects: subArray });
        });

        res.status(200).json({
            ...stats,
            totalContacted, 
            totalAnswered,
            totalNoAnswer,
            totalReject,
            totalPending: totalActualPending, 
            totalDirectPaid,
            totalEnrolled, 
            totalDelayed,
            staffBreakdown: Object.values(staffMap),
            subjectEnrollments: Object.values(subjectAggregates),
            mixerData: realMixerData,
            realEnrollmentTotals: { full: realFullCount, monthly: realMonthlyCount, installment: realInstallCount, total: realTotalEnrolled },
            verifiedStudentsNotInCrm
        });
    } catch (error) {
        console.error("Manager Stats Error:", error);
        res.status(500).json({ error: "Failed to fetch manager stats" });
    }
};

// ==========================================
// 2. NEW INQUIRIES STATS (ADVANCED WITH ROUND BREAKDOWN & RAW LEADS)
// ==========================================
exports.getNewInquiryStats = async (req, res) => {
    try {
        const { businessId, batchId, startDate, endDate } = req.query;

        const whereClause = buildStatsWhereClause(businessId, batchId, startDate, endDate, {
            campaignType: 'AFTER_SEMINAR', inquiryType: 'NEW_INQ'
        });

        let leads = await prisma.lead.findMany({
            where: whereClause,
            include: { assignedUser: { select: { firstName: true, lastName: true, businessType: true, role: true } } }
        });

        // 🔥 FIX: Bridge Transfers අනිවාර්යයෙන්ම අයින් කරන්න
        leads = leads.filter(l => l.source !== 'bridge_transfer');

        const verifiedPhones = await getVerifiedPhones(businessId, batchId);
        const primaryEnrolledLeadIds = await getPrimaryEnrolledLeadIds(businessId, batchId, verifiedPhones);
        const activeStaffIds = await getActiveStaffIds(businessId, batchId);

        let totalNewInq = leads.length;
        let totalAssigned = 0;
        let totalContacted = 0;
        let totalAnswered = 0;
        let totalNoAnswer = 0;
        let totalReject = 0;
        let totalActualPending = 0;
        let totalDirectPaid = 0;
        let totalEnrolled = 0;
        let totalDelayed = 0;
        let staffMap = {};

        const now = new Date();

        leads.forEach(l => {
            const isPending = l.newInqCallStatus === 'pending' || !l.newInqCallStatus;
            const isAnswered = l.newInqCallStatus === 'answered';
            const isNoAnswer = l.newInqCallStatus === 'no_answer';
            const isReject = l.newInqCallStatus === 'reject';

            const isReallyEnrolled = primaryEnrolledLeadIds.has(l.id);
            const isEnrolled = isReallyEnrolled || l.enrollmentStatus === 'ENROLLED' || l.enrollmentStatus === 'PAID';

            const isDirectPaid = isEnrolled && isPending;
            const isActualPending = isPending && !isEnrolled;
            const isContacted = !isPending;

            const round = l.newInqRound || 1;

            const assignedDaysPassed = (now - new Date(l.assignedAt || l.createdAt)) / (1000 * 60 * 60 * 24);
            const assignedHoursPassed = assignedDaysPassed * 24;

            let isDelayed = false;
            if (isPending && !isEnrolled) {
                if (round === 1 && assignedHoursPassed >= 24) isDelayed = true;
                if (round === 2 && assignedDaysPassed >= 7) isDelayed = true;
            }

            if (l.assignedTo) {
                totalAssigned++;
                if (isEnrolled) totalEnrolled++;
                if (isContacted) totalContacted++;
                if (isAnswered) totalAnswered++;
                if (isNoAnswer) totalNoAnswer++;
                if (isReject) totalReject++;
                if (isActualPending) totalActualPending++;
                if (isDirectPaid) totalDirectPaid++;
                if (isDelayed) totalDelayed++;

                const staffName = l.assignedUser ? `${l.assignedUser.firstName} ${l.assignedUser.lastName}`.trim() : `Staff #${l.assignedTo}`;

                // 🔥 Initialize Staff Object if not exists 🔥
                if (!staffMap[staffName]) {
                    staffMap[staffName] = {
                        name: staffName,
                        businessType: l.assignedUser?.businessType,
                        role: l.assignedUser?.role,
                        overall: { 
                            assigned: 0, contacted: 0, answered: 0, noAnswer: 0, reject: 0, pending: 0, directPaid: 0, enrolled: 0, delayed: 0, 
                            full: 0, upgrade: 0, monthly: 0, installment: 0,
                            r1HistoricalDelays: 0, r2HistoricalDelays: 0 
                        },
                        rounds: {
                            1: { assigned: 0, contacted: 0, answered: 0, noAnswer: 0, reject: 0, pending: 0, delayed: 0, movedToR2: 0, leads: [] },
                            2: { assigned: 0, contacted: 0, answered: 0, noAnswer: 0, reject: 0, pending: 0, delayed: 0, movedToPaid: 0, movedToNonEnrolled: 0, leads: [] },
                            NON_ENROLLED: { assigned: 0, contacted: 0, answered: 0, noAnswer: 0, reject: 0, pending: 0, delayed: 0, leads: [] },
                            PAID: { assigned: 0, contacted: 0, answered: 0, noAnswer: 0, reject: 0, pending: 0, leads: [] }
                        }
                    };
                }

                // 🔥 Overall Stats Update 🔥
                let bucket = 'pending';
                if (isReject) {
                    bucket = 'reject';
                } else if (isNoAnswer) {
                    bucket = 'noAnswer';
                } else if (isAnswered || isEnrolled || (isContacted && !isNoAnswer && !isReject)) {
                    bucket = 'answered';
                } else {
                    bucket = 'pending';
                }

                staffMap[staffName].overall.assigned++;
                staffMap[staffName].overall[bucket]++;
                if (isDelayed) staffMap[staffName].overall.delayed++;
                if (isContacted) staffMap[staffName].overall.contacted++;
                if (isDirectPaid) staffMap[staffName].overall.directPaid++;
                if (isEnrolled) {
                    staffMap[staffName].overall.enrolled++;
                    if (l.paymentIntention === 'FULL') staffMap[staffName].overall.full++;
                    else if (l.paymentIntention === 'UPGRADE') staffMap[staffName].overall.upgrade++;
                    else if (l.paymentIntention === 'INSTALLMENTS' || l.paymentIntention === 'INSTALLMENT') staffMap[staffName].overall.installment++;
                    else staffMap[staffName].overall.monthly++;
                }

                if (l.r1DelayedDays > 0) staffMap[staffName].overall.r1HistoricalDelays++;
                if (l.r2DelayedDays > 0) staffMap[staffName].overall.r2HistoricalDelays++;

                // Prepare Lead Object for Export
                const exportLead = {
                    id: l.id,
                    phone: l.phone ? l.phone.split('_')[0] : '',
                    name: l.name || 'Unknown',
                    phase: l.newInqPhase || 1,
                    status: l.newInqCallStatus || 'pending',
                    enrolled: l.enrollmentStatus || 'NON_ENROLLED',
                    remark: l.newInqFeedback || 'No Remark'
                };

                // 🔥 Mutually Exclusive Round-wise Stats Update 🔥
                let targetRound = 1;
                if (isEnrolled) {
                    targetRound = 'PAID';
                } else if (round === 'NON_ENROLLED' || round >= 3) {
                    targetRound = 'NON_ENROLLED';
                } else if (round === 2) {
                    targetRound = 2;
                } else {
                    targetRound = 1;
                }

                staffMap[staffName].rounds[targetRound].assigned++;
                staffMap[staffName].rounds[targetRound][bucket]++;
                if (isDelayed) staffMap[staffName].rounds[targetRound].delayed++;
                staffMap[staffName].rounds[targetRound].leads.push(exportLead);
            }
        });

        // 🔥 Raw Leads for Master Export Modal 🔥
        const rawLeadsForExport = leads.map(l => ({
            id: l.id,
            phone: l.phone ? l.phone.split('_')[0] : '', // Clean Phone
            name: l.name || 'Unknown',
            assignedToName: l.assignedUser ? `${l.assignedUser.firstName} ${l.assignedUser.lastName}` : 'Unassigned',
            round: l.newInqRound || 1,
            phase: l.newInqPhase || 1,
            callStatus: l.newInqCallStatus || 'pending',
            enrollmentStatus: l.enrollmentStatus || 'NON_ENROLLED',
            paymentPlan: l.paymentIntention || 'NOT_DECIDED',
            remark: l.newInqFeedback || 'No Remark'
        }));

        res.status(200).json({
            totalNewInq, 
            totalAssigned, 
            totalContacted, 
            totalPending: totalActualPending, 
            totalDirectPaid,
            totalEnrolled, 
            totalDelayed,
            staffBreakdown: Object.values(staffMap),
            rawLeads: rawLeadsForExport
        });
    } catch (error) {
        console.error("New Inq Stats Error:", error);
        res.status(500).json({ error: "Failed to fetch stats" });
    }
};

// ==========================================
// 3. OPEN SEMINAR STATS (ADVANCED WITH ROUND BREAKDOWN & RAW LEADS FOR EXPORT)
// ==========================================
exports.getOpenSeminarStats = async (req, res) => {
    try {
        const { businessId, batchId, startDate, endDate } = req.query;

        // 🔥 FIX: Reverted to purely OPEN_SEMINAR and NORMAL. 
        const whereClause = buildStatsWhereClause(businessId, batchId, startDate, endDate, {
            campaignType: 'AFTER_SEMINAR', inquiryType: { in: ['OPEN_SEMINAR', 'NORMAL'] }
        });

        let leads = await prisma.lead.findMany({
            where: whereClause,
            include: { assignedUser: { select: { firstName: true, lastName: true, businessType: true, role: true } } }
        });

        // Bridge Transfers අනිවාර්යයෙන්ම අයින් කරන්න
        leads = leads.filter(l => l.source !== 'bridge_transfer');

        const verifiedPhones = await getVerifiedPhones(businessId, batchId);
        const primaryEnrolledLeadIds = await getPrimaryEnrolledLeadIds(businessId, batchId, verifiedPhones);
        const activeStaffIds = await getActiveStaffIds(businessId, batchId);

        let totalOpenSem = leads.length;
        let totalAssigned = 0;
        let totalContacted = 0;
        let totalActualPending = 0;
        let totalDirectPaid = 0;
        let totalEnrolled = 0;
        let totalDelayed = 0;
        let staffMap = {};

        const now = new Date();

        leads.forEach(l => {
            const isPending = l.openSemCallStatus === 'pending' || !l.openSemCallStatus;

            const isReallyEnrolled = primaryEnrolledLeadIds.has(l.id);
            const isEnrolled = isReallyEnrolled || l.enrollmentStatus === 'ENROLLED' || l.enrollmentStatus === 'PAID';

            const isDirectPaid = isEnrolled && isPending;
            const isActualPending = isPending && !isEnrolled;
            const isContacted = !isPending;

            const round = l.openSemRound || 1;

            const referenceTime = new Date(l.assignedAt || l.updatedAt || l.createdAt);
            const assignedDaysPassed = (now - new Date(l.assignedAt || l.createdAt)) / (1000 * 60 * 60 * 24);

            let isDelayed = false;
            if (isPending && !isEnrolled) {
                if (assignedDaysPassed >= 14) isDelayed = true;
                else if (round === 1 && assignedDaysPassed >= 7) isDelayed = true;
            }

            if (l.assignedTo) {
                totalAssigned++;
                if (isEnrolled) totalEnrolled++;
                if (isContacted) totalContacted++;
                if (isActualPending) totalActualPending++;
                if (isDirectPaid) totalDirectPaid++;
                if (isDelayed) totalDelayed++;

                const staffName = l.assignedUser ? `${l.assignedUser.firstName} ${l.assignedUser.lastName}`.trim() : `Staff #${l.assignedTo}`;

                // Initialize Staff Object if not exists
                if (!staffMap[staffName]) {
                    staffMap[staffName] = {
                        name: staffName,
                        businessType: l.assignedUser?.businessType,
                        role: l.assignedUser?.role,
                        overall: { 
                            assigned: 0, contacted: 0, pending: 0, directPaid: 0, enrolled: 0, delayed: 0,
                            answered: 0, noAnswer: 0, reject: 0, full: 0, upgrade: 0, monthly: 0, installment: 0,
                            r1HistoricalDelays: 0, r2HistoricalDelays: 0
                        },
                        rounds: {
                            1: { assigned: 0, totalAssigned: 0, contacted: 0, pending: 0, delayed: 0, answered: 0, noAnswer: 0, reject: 0, movedToR2: 0, leads: [] },
                            2: { assigned: 0, totalAssigned: 0, contacted: 0, pending: 0, delayed: 0, answered: 0, noAnswer: 0, reject: 0, movedToPaid: 0, movedToNonEnrolled: 0, leads: [] },
                            NON_ENROLLED: { assigned: 0, totalAssigned: 0, contacted: 0, pending: 0, answered: 0, noAnswer: 0, reject: 0, leads: [] },
                            PAID: { assigned: 0, totalAssigned: 0, contacted: 0, pending: 0, answered: 0, noAnswer: 0, reject: 0, delayed: 0, leads: [] }
                        }
                    };
                }

                // Determine the Mutually Exclusive Bucket for this Lead
                let bucket = 'pending';
                if (l.openSemCallStatus === 'reject') {
                    bucket = 'reject';
                } else if (l.openSemCallStatus === 'no_answer') {
                    bucket = 'noAnswer';
                } else if (l.openSemCallStatus === 'answered' || isEnrolled || (isContacted && l.openSemCallStatus !== 'no_answer' && l.openSemCallStatus !== 'reject')) {
                    bucket = 'answered';
                } else {
                    bucket = 'pending';
                }

                // Overall Stats Update
                staffMap[staffName].overall.assigned++;
                staffMap[staffName].overall[bucket]++;
                if (isDelayed) staffMap[staffName].overall.delayed++;
                
                // Track totalAssigned per round
                staffMap[staffName].rounds[1].totalAssigned++;
                if (round >= 2 || (isEnrolled && round >= 2)) staffMap[staffName].rounds[2].totalAssigned++;
                if ((round >= 3 || round === 'NON_ENROLLED') && !isEnrolled) staffMap[staffName].rounds['NON_ENROLLED'].totalAssigned++;
                if (isEnrolled) staffMap[staffName].rounds['PAID'].totalAssigned++;

                if (isContacted) staffMap[staffName].overall.contacted++;
                if (isDirectPaid) staffMap[staffName].overall.directPaid++;
                if (isEnrolled) {
                    staffMap[staffName].overall.enrolled++;
                    if (l.paymentIntention === 'FULL') staffMap[staffName].overall.full++;
                    else if (l.paymentIntention === 'UPGRADE') staffMap[staffName].overall.upgrade++;
                    else if (l.paymentIntention === 'MONTHLY') staffMap[staffName].overall.monthly++;
                    else if (l.paymentIntention === 'INSTALLMENTS' || l.paymentIntention === 'INSTALLMENT') staffMap[staffName].overall.installment++;
                }

                if (l.r1DelayedDays > 0) staffMap[staffName].overall.r1HistoricalDelays++;
                if (l.r2DelayedDays > 0) staffMap[staffName].overall.r2HistoricalDelays++;

                // Prepare Lead Object for Export
                const exportLead = {
                    id: l.id,
                    phone: l.phone.split('_')[0], // Clean Phone
                    name: l.name || 'Unknown',
                    phase: l.openSemPhase || 1,
                    status: l.openSemCallStatus || 'pending',
                    enrolled: l.enrollmentStatus,
                    remark: l.openSemFeedback || 'No Remark'
                };

                // Round-wise Stats Update & Lead Pushing
                // 🔥 Mutually Exclusive Round-wise Stats Update 🔥
                let targetRound = 1;
                if (isEnrolled) {
                    targetRound = 'PAID';
                } else if (round === 'NON_ENROLLED' || round >= 3) {
                    targetRound = 'NON_ENROLLED';
                } else if (round === 2) {
                    targetRound = 2;
                } else {
                    targetRound = 1;
                }

                staffMap[staffName].rounds[targetRound].assigned++;
                staffMap[staffName].rounds[targetRound][bucket]++;
                if (isDelayed) staffMap[staffName].rounds[targetRound].delayed++;
                staffMap[staffName].rounds[targetRound].leads.push(exportLead);
            }
        });

        // 🔥 අලුතෙන් එකතු කරපු කෑල්ල: Export එකට ඕන කරන මුළු Lead Data එකම හදනවා 🔥
        const rawLeadsForExport = leads.map(l => ({
            id: l.id,
            phone: l.phone ? l.phone.split('_')[0] : '', // Clean Phone
            name: l.name || 'Unknown',
            assignedToName: l.assignedUser ? `${l.assignedUser.firstName} ${l.assignedUser.lastName}` : 'Unassigned',
            round: l.openSemRound || 1,
            phase: l.openSemPhase || 1,
            callStatus: l.openSemCallStatus || 'pending',
            enrollmentStatus: l.enrollmentStatus || 'NON_ENROLLED',
            paymentPlan: l.paymentIntention || 'NOT_DECIDED',
            remark: l.openSemFeedback || 'No Remark'
        }));

        // 🔥 NEW: Aggregate stats by round for the entire campaign (for the top table UI)
        const campaignRounds = {
            r1: { assigned: 0, currentlyInRound: 0, pending: 0, noAnswer: 0, reject: 0, delayed: 0, movedToR2: 0, rate: 0 },
            r2: { assigned: 0, currentlyInRound: 0, pending: 0, noAnswer: 0, reject: 0, delayed: 0, movedToNonEnrolled: 0, movedToPaid: 0, rate: 0 },
            nonEnrolled: { assigned: 0, currentlyInRound: 0, pending: 0, reject: 0, delayed: 0 },
            paid: { assigned: 0, currentlyInRound: 0 }
        };

        const isDelayedFn = (l) => {
            if (l.enrollmentStatus === 'ENROLLED' || l.enrollmentStatus === 'PAID') return false;
            const startTime = new Date(l.assignedAt || l.createdAt).getTime();
            const diffMs = now.getTime() - startTime;
            const currentRound = l.openSemRound || 1;
            if (currentRound === 1) return diffMs > 7 * 24 * 60 * 60 * 1000;
            if (currentRound === 2) return diffMs > 14 * 24 * 60 * 60 * 1000;
            return false;
        };

        // R1
        campaignRounds.r1.assigned = leads.length;
        const r1Current = leads.filter(l => (l.openSemRound || 1) === 1 && l.enrollmentStatus !== 'ENROLLED' && !primaryEnrolledLeadIds.has(l.id));
        campaignRounds.r1.currentlyInRound = r1Current.length;
        campaignRounds.r1.pending = r1Current.filter(l => l.openSemCallStatus === 'pending' || !l.openSemCallStatus).length;
        campaignRounds.r1.noAnswer = r1Current.filter(l => l.openSemCallStatus === 'no_answer').length;
        campaignRounds.r1.reject = r1Current.filter(l => l.openSemCallStatus === 'reject').length;
        campaignRounds.r1.delayed = r1Current.filter(l => isDelayedFn(l) && (l.openSemCallStatus === 'pending' || !l.openSemCallStatus)).length;
        campaignRounds.r1.movedToR2 = leads.filter(l => (l.openSemRound || 1) > 1 && l.enrollmentStatus !== 'ENROLLED' && !primaryEnrolledLeadIds.has(l.id)).length;
        
        const r1AnsweredCount = leads.filter(l => (l.openSemRound || 1) > 1 || l.enrollmentStatus === 'ENROLLED' || primaryEnrolledLeadIds.has(l.id) || l.openSemCallStatus === 'answered').length;
        campaignRounds.r1.rate = campaignRounds.r1.assigned > 0 ? ((r1AnsweredCount / campaignRounds.r1.assigned) * 100).toFixed(1) : 0;

        // R2
        const r2Arrived = leads.filter(l => (l.openSemRound || 1) >= 2);
        campaignRounds.r2.assigned = r2Arrived.length;
        const r2Current = r2Arrived.filter(l => (l.openSemRound || 1) === 2 && l.enrollmentStatus !== 'ENROLLED' && !primaryEnrolledLeadIds.has(l.id));
        campaignRounds.r2.currentlyInRound = r2Current.length;
        campaignRounds.r2.pending = r2Current.filter(l => l.openSemCallStatus === 'pending' || !l.openSemCallStatus).length;
        campaignRounds.r2.noAnswer = r2Current.filter(l => l.openSemCallStatus === 'no_answer').length;
        campaignRounds.r2.reject = r2Current.filter(l => l.openSemCallStatus === 'reject').length;
        campaignRounds.r2.delayed = r2Current.filter(l => isDelayedFn(l) && (l.openSemCallStatus === 'pending' || !l.openSemCallStatus)).length;
        campaignRounds.r2.movedToNonEnrolled = r2Arrived.filter(l => (l.openSemRound || 1) >= 3 && l.enrollmentStatus !== 'ENROLLED' && !primaryEnrolledLeadIds.has(l.id)).length;
        campaignRounds.r2.movedToPaid = r2Arrived.filter(l => l.enrollmentStatus === 'ENROLLED' || primaryEnrolledLeadIds.has(l.id)).length;
        
        const r2AnsweredCount = r2Arrived.filter(l => (l.openSemRound || 1) > 2 || l.enrollmentStatus === 'ENROLLED' || primaryEnrolledLeadIds.has(l.id) || l.openSemCallStatus === 'answered').length;
        campaignRounds.r2.rate = campaignRounds.r2.assigned > 0 ? ((r2AnsweredCount / campaignRounds.r2.assigned) * 100).toFixed(1) : 0;

        // Non Enrolled
        const neLeads = leads.filter(l => (l.openSemRound || 1) >= 3 && l.enrollmentStatus !== 'ENROLLED' && !primaryEnrolledLeadIds.has(l.id));
        campaignRounds.nonEnrolled.assigned = neLeads.length;
        campaignRounds.nonEnrolled.currentlyInRound = neLeads.length;
        campaignRounds.nonEnrolled.pending = neLeads.filter(l => l.openSemCallStatus === 'pending' || !l.openSemCallStatus).length;
        campaignRounds.nonEnrolled.reject = neLeads.filter(l => l.openSemCallStatus === 'reject').length;
        campaignRounds.nonEnrolled.delayed = neLeads.filter(l => isDelayedFn(l) && (l.openSemCallStatus === 'pending' || !l.openSemCallStatus)).length;

        // Paid
        const paidLeads = leads.filter(l => l.enrollmentStatus === 'ENROLLED' || l.enrollmentStatus === 'PAID' || primaryEnrolledLeadIds.has(l.id));
        campaignRounds.paid.assigned = paidLeads.length;
        campaignRounds.paid.currentlyInRound = paidLeads.length;

        res.status(200).json({
            totalOpenSem, totalAssigned, totalContacted, totalPending: totalActualPending, totalDirectPaid, totalEnrolled, totalDelayed,
            campaignRounds,
            staffBreakdown: Object.values(staffMap),
            rawLeads: rawLeadsForExport // 🔥 Export එකට මේක අත්‍යවශ්‍යයි
        });
    } catch (error) {
        console.error("Open Sem Stats Error:", error);
        res.status(500).json({ error: "Failed to fetch stats" });
    }
};

// ==========================================
// 4. BRIDGE PERFORMANCE STATS
// ==========================================
exports.getBridgePerformanceStats = async (req, res) => {
    try {
        const { businessId, batchId, startDate, endDate } = req.query;

        const whereClause = buildStatsWhereClause(businessId, batchId, startDate, endDate, {
            campaignType: 'AFTER_SEMINAR', source: 'bridge_transfer'
        });

        const leads = await prisma.lead.findMany({
            where: whereClause,
            include: { assignedUser: { select: { firstName: true, lastName: true, businessType: true, role: true } } }
        });

        // 🔥 ALUTH KALLA: Lamai ewapu messages (inbound) thiyena leads count karanawa 🔥
        const leadIds = leads.map(l => l.id);
        let totalReplied = 0;

        if (leadIds.length > 0) {
            const inboundMsgCounts = await prisma.chatMessage.groupBy({
                by: ['leadId'],
                where: {
                    leadId: { in: leadIds },
                    direction: 'inbound' // Lamaya ewapu messages pamanai
                }
            });
            // Me leads set eke lamai kidenek message karalada kiyala gannawa
            totalReplied = inboundMsgCounts.length;
        }

        const verifiedPhones = await getVerifiedPhones(businessId, batchId);
        const primaryEnrolledLeadIds = await getPrimaryEnrolledLeadIds(businessId, batchId, verifiedPhones);
        const activeStaffIds = await getActiveStaffIds(businessId, batchId);

        let totalTransferred = leads.length;
        let totalContacted = 0; let totalPending = 0; let totalEnrolled = 0;
        let staffMap = {};

        leads.forEach(l => {
            const isPending = l.callStatus === 'pending' || !l.callStatus;

            const isReallyEnrolled = primaryEnrolledLeadIds.has(l.id);
            const isEnrolled = isReallyEnrolled || l.enrollmentStatus === 'ENROLLED';

            const isContacted = !isPending;

            if (isContacted) totalContacted++;
            if (isPending) totalPending++;
            if (isEnrolled) totalEnrolled++;

            if (l.assignedTo) {
                const staffName = l.assignedUser ? `${l.assignedUser.firstName} ${l.assignedUser.lastName}`.trim() : `Staff #${l.assignedTo}`;
                if (!staffMap[staffName]) {
                    staffMap[staffName] = { name: staffName, businessType: l.assignedUser?.businessType, role: l.assignedUser?.role, assigned: 0, contacted: 0, pending: 0, enrolled: 0 };
                }
                staffMap[staffName].assigned++;
                if (isContacted) staffMap[staffName].contacted++;
                if (isPending) staffMap[staffName].pending++;
                if (isEnrolled) staffMap[staffName].enrolled++;
            }
        });

        res.status(200).json({
            totalTransferred, totalContacted, totalPending, totalEnrolled,
            totalReplied, // 🔥 Frontend ekata aluth stat eka yawanawa
            staffBreakdown: Object.values(staffMap)
        });
    } catch (error) {
        console.error("Bridge Stats Error:", error);
        res.status(500).json({ error: "Failed to fetch bridge stats" });
    }
};

// ==========================================
// 5. PAID CAMPAIGN STATS
// ==========================================
exports.getPaidCampaignStats = async (req, res) => {
    try {
        const { businessId, batchId, startDate, endDate } = req.query;

        const whereClause = buildStatsWhereClause(businessId, batchId, startDate, endDate, {
            campaignType: 'AFTER_SEMINAR', inquiryType: 'PAID_CAMP', enrollmentStatus: 'ENROLLED'
        });

        const leads = await prisma.lead.findMany({
            where: whereClause,
            include: { assignedUser: { select: { firstName: true, lastName: true, businessType: true, role: true } } }
        });

        const verifiedPhones = await getVerifiedPhones(businessId, batchId);
        const activeStaffIds = await getActiveStaffIds(businessId, batchId);

        const activeLeads = leads.filter(l => {
            if (!l.phone) return false;
            const cleanPhone = l.phone.split('_')[0].replace(/[^0-9]/g, '');
            return cleanPhone.length >= 7 && verifiedPhones.has(cleanPhone.slice(-7));
        });

        let totalPaidLeads = activeLeads.length;
        let totalContacted = 0; let totalPending = 0;
        let staffMap = {};

        activeLeads.forEach(l => {
            const isPending = l.paidCallStatus === 'pending' || !l.paidCallStatus;
            const isContacted = !isPending;

            if (isContacted) totalContacted++;
            if (isPending) totalPending++;

            if (l.assignedTo) {
                const staffName = l.assignedUser ? `${l.assignedUser.firstName} ${l.assignedUser.lastName}`.trim() : `Staff #${l.assignedTo}`;
                if (!staffMap[staffName]) {
                    staffMap[staffName] = { name: staffName, businessType: l.assignedUser?.businessType, assigned: 0, contacted: 0, pending: 0 };
                }
                staffMap[staffName].assigned++;
                if (isContacted) staffMap[staffName].contacted++;
                if (isPending) staffMap[staffName].pending++;
            }
        });

        res.status(200).json({
            totalPaidLeads, totalContacted, totalPending,
            staffBreakdown: Object.values(staffMap)
        });
    } catch (error) {
        console.error("Paid Campaign Stats Error:", error);
        res.status(500).json({ error: "Failed to fetch stats" });
    }
};

// ==========================================
// 6. MASTER DIRECTORY API
// ==========================================
exports.getMasterDirectory = async (req, res) => {
    try {
        const { businessId } = req.query;

        const whereClause = buildStatsWhereClause(businessId, null, null, null, {
            campaignType: 'AFTER_SEMINAR'
        });

        const leads = await prisma.lead.findMany({
            where: whereClause,
            select: { id: true, name: true, phone: true, inquiryType: true, paymentIntention: true, enrollmentStatus: true, batchId: true },
            orderBy: { createdAt: 'desc' }
        });

        // 🏦 1. Fetch all verified payments (status: 1 or 4)
        const paymentWhere = { status: { in: [1, 4] } };
        if (businessId && businessId !== 'ALL') {
            paymentWhere.businessId = parseInt(businessId);
        }
        const verifiedPayments = await prisma.payment.findMany({
            where: paymentWhere,
            include: { student: true, batch: true }
        });

        // Index all lead phones by cleaning them (split suffix first!)
        const cleanPhoneToLeadMap = {};
        leads.forEach(l => {
            if (!l.phone) return;
            const mainPhonePart = l.phone.split('_')[0];
            const cleanLeadPhone = mainPhonePart.replace(/[^0-9]/g, '');
            if (cleanLeadPhone.length >= 9) {
                cleanPhoneToLeadMap[cleanLeadPhone.slice(-9)] = l;
            }
        });

        // Gather all unique NICs and phone numbers of students in verifiedPayments to find related records
        const verifiedStudentNics = [];
        const verifiedStudentPhones = [];
        verifiedPayments.forEach(p => {
            if (p.student) {
                if (p.student.nic) verifiedStudentNics.push(p.student.nic.trim());
                if (p.student.phone) verifiedStudentPhones.push(p.student.phone);
                if (p.student.whatsapp) verifiedStudentPhones.push(p.student.whatsapp);
                if (p.student.optionalPhone) verifiedStudentPhones.push(p.student.optionalPhone);
            }
        });

        const relatedStudents = await prisma.user.findMany({
            where: {
                role: { in: ['Student', 'USER', 'user', 'student', 'STUDENT'] },
                OR: [
                    { nic: { in: verifiedStudentNics.filter(Boolean) } },
                    { phone: { in: verifiedStudentPhones.filter(Boolean) } },
                    { whatsapp: { in: verifiedStudentPhones.filter(Boolean) } },
                    { optionalPhone: { in: verifiedStudentPhones.filter(Boolean) } }
                ]
            }
        });

        // Map each student.id in verifiedPayments to all related phone suffixes (last 9 digits)
        const studentIdToRelatedPhonesMap = {};
        verifiedPayments.forEach(p => {
            if (!p.student) return;
            const stu = p.student;
            const sid = stu.id;

            const matches = relatedStudents.filter(other => {
                if (other.id === sid) return true;
                if (stu.nic && other.nic && stu.nic.trim() === other.nic.trim()) return true;
                const stuNumSet = new Set([stu.phone, stu.whatsapp, stu.optionalPhone].filter(Boolean));
                const otherNumSet = new Set([other.phone, other.whatsapp, other.optionalPhone].filter(Boolean));
                for (let num of stuNumSet) {
                    if (otherNumSet.has(num)) return true;
                }
                return false;
            });

            const phoneSuffixes = new Set();
            matches.forEach(m => {
                [m.phone, m.whatsapp, m.optionalPhone].forEach(ph => {
                    if (!ph) return;
                    const cleanPh = ph.replace(/[^0-9]/g, '');
                    if (cleanPh.length >= 9) {
                        phoneSuffixes.add(cleanPh.slice(-9));
                    }
                });
            });

            studentIdToRelatedPhonesMap[stu.id] = phoneSuffixes;
        });

        // Find verified students who are not in the leads list
        const verifiedStudentsNotInCrm = [];
        const seenStudentPhones = new Set();
        const verifiedPhones = new Set();

        verifiedPayments.forEach(p => {
            if (!p.student) return;
            const stuPhone = (p.student.phone || p.student.whatsapp || '').replace(/[^0-9]/g, '');
            if (stuPhone.length < 9) return;
            const key = stuPhone.slice(-9);

            const relatedSuffixes = studentIdToRelatedPhonesMap[p.student.id] || new Set();
            relatedSuffixes.forEach(suffix => verifiedPhones.add(suffix));

            if (seenStudentPhones.has(key)) return;
            seenStudentPhones.add(key);

            // Check if any of their related phone suffixes has a lead in CRM
            let hasCrmLead = false;
            for (let suffix of relatedSuffixes) {
                if (cleanPhoneToLeadMap[suffix]) {
                    hasCrmLead = true;
                    break;
                }
            }

            if (!hasCrmLead) {
                verifiedStudentsNotInCrm.push({
                    id: `stu_${p.student.id}`,
                    studentId: p.student.id,
                    name: `${p.student.firstName} ${p.student.lastName}`,
                    phone: p.student.phone || p.student.whatsapp || 'N/A',
                    inquiryType: 'DIRECT_SIGNUP',
                    paymentIntention: p.payment_type === 3 ? 'FULL' : (p.payment_type === 2 ? 'INSTALLMENT' : 'MONTHLY'),
                    enrollmentStatus: 'ENROLLED',
                    batchId: p.batchId,
                    batchName: p.batch?.name || 'N/A',
                    amountPaid: p.amount
                });
            }
        });

        // Strict verification: Filter the returned leads list so they are only counted as ENROLLED if they have verified payments
        leads.forEach(l => {
            if (!l.phone) return;
            const cleanLeadPhone = l.phone.split('_')[0].replace(/[^0-9]/g, '');
            const key = cleanLeadPhone.slice(-9);

            const isReallyEnrolled = cleanLeadPhone.length >= 9 && verifiedPhones.has(key);
            l.enrollmentStatus = isReallyEnrolled ? 'ENROLLED' : 'NON_ENROLLED';
        });

        res.status(200).json({ leads, verifiedStudentsNotInCrm });
    } catch (error) {
        console.error("Master Directory Error:", error);
        res.status(500).json({ error: "Failed to fetch master directory" });
    }
};

// ==========================================
// 7. B2B LEAD TRANSFER API (NEW)
// ==========================================
exports.transferB2BLeads = async (req, res) => {
    try {
        const { leadIds, targetBusinessId, sourceBusinessId, transferRemark } = req.body;

        if (!leadIds || !targetBusinessId || leadIds.length === 0) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const leads = await prisma.lead.findMany({
            where: { id: { in: leadIds } }
        });

        // 🔥 History එක හදාගන්න ලේසි වෙන්න Timestamp එකක් ගන්නවා
        const timestamp = new Date().toISOString();

        const updatePromises = leads.map(lead => {
            let newPhone = lead.phone;

            newPhone = newPhone.replace(/_BIZ_\d+(_[A-Z0-9_]+)?/g, '');
            newPhone = `${newPhone}_BIZ_${targetBusinessId}`;

            // System Message + Custom Message
            const systemRemark = `[B2B_LOG] FROM:${sourceBusinessId || '0'} TO:${targetBusinessId} DATE:${timestamp}\n[B2B TRANSFER]: Auto-transferred from Business Unit ${sourceBusinessId || 'Unknown'} to ${targetBusinessId}`;
            const userRemark = transferRemark ? `\n[TRANSFER NOTE]: ${transferRemark}` : '';

            const newFeedback = lead.feedback
                ? `${lead.feedback}\n\n${systemRemark}${userRemark}`
                : `${systemRemark}${userRemark}`;

            let dataToUpdate = {
                phone: newPhone,
                feedback: newFeedback,
                callStatus: 'pending'
            };

            if (lead.batchId) dataToUpdate.batch = { disconnect: true };
            if (lead.assignedTo) dataToUpdate.assignedUser = { disconnect: true };

            return prisma.lead.update({
                where: { id: lead.id },
                data: dataToUpdate
            });
        });

        await prisma.$transaction(updatePromises);
        res.status(200).json({ message: `Successfully transferred ${leads.length} leads.` });
    } catch (error) {
        console.error("B2B Transfer Error:", error);
        res.status(500).json({ error: "Failed to transfer leads" });
    }
};

exports.getB2BTransferHistory = async (req, res) => {
    try {
        const { businessId } = req.query;
        if (!businessId) return res.status(400).json({ error: "Business ID required" });

        // 🔥 Database එකේ Feedback එකේ [B2B_LOG] තියෙන Leads සේරම අදිනවා (Name, Phone එක්කම)
        const transferLeads = await prisma.lead.findMany({
            where: { feedback: { contains: '[B2B_LOG]' } },
            select: { id: true, name: true, phone: true, feedback: true }
        });

        const inbox = {};
        const sent = {};

        transferLeads.forEach(lead => {
            const lines = lead.feedback.split('\n');

            // අන්තිමට දාපු Remark එක ගන්නවා
            let currentNote = "";
            const noteMatches = lead.feedback.match(/\[TRANSFER NOTE\]:\s*(.*)/g);
            if (noteMatches && noteMatches.length > 0) {
                currentNote = noteMatches[noteMatches.length - 1].replace('[TRANSFER NOTE]:', '').trim();
            }

            // Lead එකේ විස්තර
            const leadInfo = {
                id: lead.id,
                name: lead.name || 'Unknown',
                phone: lead.phone ? lead.phone.split('_')[0] : 'No Phone',
                remark: currentNote
            };

            lines.forEach(line => {
                if (line.startsWith('[B2B_LOG]')) {
                    const match = line.match(/FROM:(\d+) TO:(\d+) DATE:(.+)/);
                    if (match) {
                        const fromBiz = parseInt(match[1]);
                        const toBiz = parseInt(match[2]);
                        const dateStr = new Date(match[3]).toLocaleString();
                        const keyKey = match[3].substring(0, 16); // විනාඩියෙන් විනාඩියට ගෲප් කරනවා

                        // මේක මට ආපු එකක් නම් (Inbox)
                        if (toBiz === parseInt(businessId)) {
                            const key = `IN_${fromBiz}_${keyKey}`;
                            if (!inbox[key]) inbox[key] = { id: key, fromBizId: fromBiz, date: dateStr, leads: [], isNew: true };
                            if (!inbox[key].leads.find(l => l.id === lead.id)) inbox[key].leads.push(leadInfo);
                        }
                        // මේක මම යවපු එකක් නම් (Sent)
                        if (fromBiz === parseInt(businessId)) {
                            const key = `OUT_${toBiz}_${keyKey}`;
                            if (!sent[key]) sent[key] = { id: key, toBizId: toBiz, date: dateStr, leads: [] };
                            if (!sent[key].leads.find(l => l.id === lead.id)) sent[key].leads.push(leadInfo);
                        }
                    }
                }
            });
        });

        // අලුත්ම දිනේ උඩට එන්න Sort කරනවා
        const sortedInbox = Object.values(inbox).sort((a, b) => new Date(b.date) - new Date(a.date));
        const sortedSent = Object.values(sent).sort((a, b) => new Date(b.date) - new Date(a.date));

        res.status(200).json({ inbox: sortedInbox, sent: sortedSent });
    } catch (error) {
        console.error("B2B History Error:", error);
        res.status(500).json({ error: "Failed to load transfer history" });
    }
};

// ==========================================
// 8. COORDINATOR PROGRESS SHEET API
// ==========================================
exports.getCoordinatorProgressSheetStats = async (req, res) => {
    try {
        const { businessId, batchId, startDate, endDate } = req.query;

        // Fetch leads using the existing filter builder
        const whereClause = buildStatsWhereClause(businessId, batchId, startDate, endDate, {
            campaignType: 'AFTER_SEMINAR'
        });

        // Bridge Transfers should be excluded from performance tracking to maintain accuracy
        whereClause.NOT = {
            source: 'bridge_transfer',
            lastMessage: null
        };

        const leads = await prisma.lead.findMany({
            where: whereClause,
            include: { assignedUser: { select: { firstName: true, lastName: true, businessType: true, role: true } } }
        });

        const activeStaffIds = await getActiveStaffIds(businessId, batchId);
        let coordinatorMap = {};

        leads.forEach(l => {
            // Only aggregate if lead is assigned to active staff
            if (l.assignedTo) {
                const staffName = l.assignedUser ? `${l.assignedUser.firstName} ${l.assignedUser.lastName}`.trim() : `Staff #${l.assignedTo}`;

                if (!coordinatorMap[staffName]) {
                    coordinatorMap[staffName] = {
                        name: staffName,
                        totalAssigned: 0,
                        openSem: { total: 0, pending: 0, covered: 0, rounds: {} },
                        newInq: { total: 0, pending: 0, covered: 0 },
                        paid: { total: 0, pending: 0, covered: 0 }
                    };
                }

                const staffStats = coordinatorMap[staffName];
                staffStats.totalAssigned++;

                const isPending = l.callStatus === 'pending' || !l.callStatus;

                if (l.inquiryType === 'NEW_INQ') {
                    staffStats.newInq.total++;
                    if (isPending) staffStats.newInq.pending++;
                    else staffStats.newInq.covered++;
                } else if (l.inquiryType === 'PAID_CAMP') {
                    staffStats.paid.total++;
                    if (isPending) staffStats.paid.pending++;
                    else staffStats.paid.covered++;
                } else {
                    // Treat everything else (like OPEN_SEMINAR, NORMAL) as Open Seminar
                    staffStats.openSem.total++;
                    if (isPending) staffStats.openSem.pending++;
                    else staffStats.openSem.covered++;

                    // Breakdown by round
                    const round = l.coordinationRound || 1;
                    if (!staffStats.openSem.rounds[round]) {
                        staffStats.openSem.rounds[round] = { total: 0, pending: 0, covered: 0 };
                    }
                    staffStats.openSem.rounds[round].total++;
                    if (isPending) staffStats.openSem.rounds[round].pending++;
                    else staffStats.openSem.rounds[round].covered++;
                }
            }
        });

        // Prepare raw leads for Export Data Sheet
        const rawLeadsForExport = leads.map(l => ({
            id: l.id,
            coordinatorName: l.assignedUser ? `${l.assignedUser.firstName} ${l.assignedUser.lastName}` : 'Unassigned',
            phone: l.phone ? l.phone.split('_')[0] : '', // Clean Phone
            name: l.name || 'Unknown',
            inquiryType: l.inquiryType || 'OPEN_SEMINAR',
            round: l.coordinationRound || 1,
            phase: l.phase || 1,
            callStatus: l.callStatus || 'pending',
            enrollmentStatus: l.enrollmentStatus || 'NON_ENROLLED',
            paymentPlan: l.paymentIntention || 'NOT_DECIDED',
            remark: l.feedback || 'No Remark'
        }));

        res.status(200).json({
            coordinators: Object.values(coordinatorMap),
            rawLeads: rawLeadsForExport
        });

    } catch (error) {
        console.error("Coordinator Progress Stats Error:", error);
        res.status(500).json({ error: "Failed to fetch coordinator progress stats" });
    }
};

// ==========================================
// 6. UNASSIGNED BATCH LEADS CONTROLLERS
// ==========================================
exports.getUnassignedBatchLeads = async (req, res) => {
    try {
        const { businessId } = req.query;
        if (!businessId) return res.status(400).json({ error: "businessId is required" });

        const whereClause = {
            batchId: null,
            campaignType: 'AFTER_SEMINAR',
            OR: [
                { phone: { contains: `_BIZ_${businessId}` } }
            ]
        };

        const leads = await prisma.lead.findMany({
            where: whereClause,
            select: { id: true, name: true, phone: true, campaignType: true, inquiryType: true, createdAt: true }
        });

        const formattedLeads = leads.map(l => ({
            id: l.id,
            name: l.name || 'Unknown',
            phone: l.phone ? l.phone.split('_')[0] : '',
            campaignType: l.campaignType,
            inquiryType: l.inquiryType,
            createdAt: l.createdAt
        }));

        res.status(200).json({ leads: formattedLeads, count: formattedLeads.length });
    } catch (error) {
        console.error("getUnassignedBatchLeads Error:", error);
        res.status(500).json({ error: "Failed to fetch unassigned batch leads" });
    }
};

exports.getBusinessBatches = async (req, res) => {
    try {
        const { businessId } = req.query;
        if (!businessId) return res.status(400).json({ error: "businessId is required" });

        const batches = await prisma.batch.findMany({
            where: { businessId: parseInt(businessId) },
            select: { id: true, name: true }
        });

        res.status(200).json(batches);
    } catch (error) {
        console.error("getBusinessBatches Error:", error);
        res.status(500).json({ error: "Failed to fetch business batches" });
    }
};

exports.getCoordinators = async (req, res) => {
    try {
        const staff = await prisma.user.findMany({
            where: {
                role: { notIn: ['Student', 'USER', 'STUDENT', 'student', 'user'] }
            },
            select: { id: true, firstName: true, lastName: true, role: true, businessType: true }
        });

        res.status(200).json(staff);
    } catch (error) {
        console.error("getCoordinators Error:", error);
        res.status(500).json({ error: "Failed to fetch coordinators" });
    }
};

exports.getLeadChatHistory = async (req, res) => {
    try {
        const { leadId } = req.params;
        if (!leadId) return res.status(400).json({ error: "leadId is required" });

        const messages = await prisma.chatMessage.findMany({
            where: { leadId: parseInt(leadId) },
            orderBy: { createdAt: 'asc' }
        });

        res.status(200).json({ messages });
    } catch (error) {
        console.error("getLeadChatHistory Error:", error);
        res.status(500).json({ error: "Failed to fetch chat history" });
    }
};

exports.assignLeadsToBatch = async (req, res) => {
    try {
        const { leadIds, targetBatchId } = req.body;
        if (!leadIds || !Array.isArray(leadIds) || !targetBatchId) {
            return res.status(400).json({ error: "leadIds array and targetBatchId are required" });
        }

        const batchId = parseInt(targetBatchId);
        const result = await prisma.lead.updateMany({
            where: { id: { in: leadIds } },
            data: { batchId }
        });

        res.status(200).json({ message: "Leads successfully assigned to batch", count: result.count });
    } catch (error) {
        console.error("assignLeadsToBatch Error:", error);
        res.status(500).json({ error: "Failed to assign leads to batch" });
    }
};

// ==========================================
// 7. MISSING PAID WEB STUDENTS CONTROLLERS
// ==========================================
exports.getMissingPaidStudents = async (req, res) => {
    try {
        const { businessId, batchId } = req.query;
        if (!businessId || !batchId) return res.status(400).json({ error: "businessId and batchId are required" });

        const paymentWhere = { status: { in: [1, 4] } };
        if (batchId !== 'ALL' && batchId !== 'undefined' && batchId !== 'null') paymentWhere.batchId = parseInt(batchId);
        else paymentWhere.businessId = parseInt(businessId);

        const verifiedPayments = await prisma.payment.findMany({
            where: paymentWhere,
            include: { student: true, batch: true }
        });

        const paidStudentMap = {};
        verifiedPayments.forEach(p => {
            if (p.student) {
                paidStudentMap[p.student.id] = {
                    id: p.student.id,
                    name: `${p.student.firstName || ''} ${p.student.lastName || ''}`.trim() || 'Unknown',
                    phone: p.student.phone || p.student.whatsapp || p.student.optionalPhone || '',
                    nic: p.student.nic || '',
                    batchName: p.batch?.name || ''
                };
            }
        });

        const paidStudents = Object.values(paidStudentMap);

        const whereClause = buildStatsWhereClause(businessId, batchId, null, null, { campaignType: 'AFTER_SEMINAR' });
        const crmLeads = await prisma.lead.findMany({
            where: whereClause,
            select: { id: true, phone: true }
        });

        const crmPhoneSuffixes = new Set();
        crmLeads.forEach(l => {
            if (l.phone) {
                const cleanPhone = l.phone.split('_')[0].replace(/[^0-9]/g, '');
                if (cleanPhone.length >= 7) crmPhoneSuffixes.add(cleanPhone.slice(-7));
            }
        });

        const missingStudents = paidStudents.filter(s => {
            const cleanPhone = s.phone.replace(/[^0-9]/g, '');
            if (cleanPhone.length >= 7) {
                const suffix = cleanPhone.slice(-7);
                return !crmPhoneSuffixes.has(suffix);
            }
            return true;
        });

        res.status(200).json({ missingStudents, count: missingStudents.length });
    } catch (error) {
        console.error("getMissingPaidStudents Error:", error);
        res.status(500).json({ error: "Failed to fetch missing paid students" });
    }
};

exports.pushMissingStudentToCrm = async (req, res) => {
    try {
        const { studentId, businessId, batchId, coordinatorId } = req.body;
        if (!studentId || !businessId || !batchId || !coordinatorId) {
            return res.status(400).json({ error: "studentId, businessId, batchId, and coordinatorId are required" });
        }

        const student = await prisma.user.findUnique({ where: { id: parseInt(studentId) } });
        if (!student) return res.status(404).json({ error: "Student not found" });

        const phone = student.phone || student.whatsapp || student.optionalPhone;
        if (!phone) return res.status(400).json({ error: "Student has no phone number" });

        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const formattedPhone = `${cleanPhone}_BIZ_${businessId}`;

        const lead = await prisma.lead.upsert({
            where: { phone: formattedPhone },
            update: {
                batchId: parseInt(batchId),
                assignedTo: parseInt(coordinatorId),
                enrollmentStatus: 'ENROLLED',
                openSemRound: 3,
                newInqRound: 3,
                assignedAt: new Date()
            },
            create: {
                name: `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Student',
                phone: formattedPhone,
                source: 'web_registration',
                campaignType: 'AFTER_SEMINAR',
                inquiryType: 'NORMAL',
                batchId: parseInt(batchId),
                assignedTo: parseInt(coordinatorId),
                enrollmentStatus: 'ENROLLED',
                openSemRound: 3,
                newInqRound: 3,
                assignedAt: new Date()
            }
        });

        res.status(200).json({ message: "Student pushed & assigned to coordinator successfully", lead });
    } catch (error) {
        console.error("pushMissingStudentToCrm Error:", error);
        res.status(500).json({ error: "Failed to push missing student to CRM" });
    }
};