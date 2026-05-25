const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
    verifiedPayments.forEach(p => {
        if (p.student) {
            const relatedSuffixes = studentIdToRelatedPhonesMap[p.student.id] || new Set();
            relatedSuffixes.forEach(suffix => verifiedPhones.add(suffix));
        }
    });

    return verifiedPhones;
};


// 🔥 STRICT HELPER: Fixed BIZ_ string format to prevent Business ID bleeding 🔥
const buildStatsWhereClause = (businessId, batchId, startDate, endDate, baseConditions = {}) => {
    let whereClause = { ...baseConditions };

    if (batchId && batchId !== '' && batchId !== 'ALL') {
        whereClause.batchId = parseInt(batchId);
    } else if (businessId && businessId !== '' && businessId !== 'ALL') {
        whereClause.OR = [
            { phone: { endsWith: `_BIZ_${businessId}` } },         
            { phone: { endsWith: `_BIZ_${businessId}_AS` } },      
            { phone: { contains: `_BIZ_${businessId}_BATCH_` } },
            // 🔥 මේ කෑලි දෙක තමා Manager Stats වලට අඩු වෙලා තිබ්බේ! 🔥
            { phone: { contains: `_BIZ_${businessId}_ROUND_` } },
            { phone: { contains: `_BIZ_${businessId}_HISTORY_ROUND_` } }
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
        if (batchId && batchId !== 'ALL') {
            const batchGroups = await prisma.group.findMany({ where: { batchId: parseInt(batchId) }, select: { id: true } });
            courseWhere.groupId = { in: batchGroups.map(g => g.id) };
        } else if (businessId && businessId !== 'ALL') {
            const bizBatches = await prisma.batch.findMany({ where: { businessId: parseInt(businessId) }, select: { id: true } });
            const bizGroups = await prisma.group.findMany({ where: { batchId: { in: bizBatches.map(b => b.id) } }, select: { id: true } });
            courseWhere.groupId = { in: bizGroups.map(g => g.id) };
        }

        const whereClause = buildStatsWhereClause(businessId, batchId, startDate, endDate, { campaignType: 'AFTER_SEMINAR' });

        const leads = await prisma.lead.findMany({
            where: whereClause,
            include: { assignedUser: { select: { firstName: true, lastName: true } } }
        });

        // 🔥 1. PAYMENT VERIFICATION (Get all verified phones first) 🔥
        const paymentWhere = { status: { in: [1, 4] } }; 
        if (batchId && batchId !== 'ALL') paymentWhere.batchId = parseInt(batchId);
        else if (businessId && businessId !== 'ALL') paymentWhere.businessId = parseInt(businessId);

        const verifiedPayments = await prisma.payment.findMany({
            where: paymentWhere,
            include: { student: true, batch: true }
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
        verifiedPayments.forEach(p => {
            if (p.student) {
                const relatedSuffixes = studentIdToRelatedPhonesMap[p.student.id] || new Set();
                relatedSuffixes.forEach(suffix => verifiedPhones.add(suffix));
            }
        });

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

        // 2. Stats & Mixer Data
        let stats = { totalLeads: leads.length, assignedLeads: 0, unassignedLeads: 0, openSemLeads: 0, newInqLeads: 0, bridgeLeads: 0 };
        let staffMap = {};

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
                const staffName = l.assignedUser ? `${l.assignedUser.firstName} ${l.assignedUser.lastName}` : `Unknown`;
                if (!staffMap[staffName]) staffMap[staffName] = 0;
                staffMap[staffName]++;
            } else {
                stats.unassignedLeads++;
            }
        }

        // 3. Populate Mixer Data (Using real verified payments only)
        const paymentData = await prisma.payment.findMany({
            where: paymentWhere,
            select: { studentId: true, payment_type: true, subjects: true }
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
                } catch(e) {}
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
            staffAllocation: Object.keys(staffMap).map(name => ({ name, assigned: staffMap[name] })),
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
            include: { assignedUser: { select: { firstName: true, lastName: true } } }
        });

        // 🔥 FIX: Bridge Transfers අනිවාර්යයෙන්ම අයින් කරන්න
        leads = leads.filter(l => l.source !== 'bridge_transfer');

        const verifiedPhones = await getVerifiedPhones(businessId, batchId);

        let totalNewInq = leads.length;
        let totalAssigned = 0; 
        let totalContacted = 0; 
        let totalPending = 0; 
        let totalEnrolled = 0; 
        let totalDelayed = 0;
        let staffMap = {};
        
        const now = new Date();

        leads.forEach(l => {
            const isPending = l.callStatus === 'pending' || !l.callStatus;
            
            const cleanPhone = l.phone ? l.phone.split('_')[0].replace(/[^0-9]/g, '') : '';
            const isReallyEnrolled = cleanPhone.length >= 7 && verifiedPhones.has(cleanPhone.slice(-7));
            const isEnrolled = isReallyEnrolled;
            
            const isContacted = !isPending;
            const round = l.coordinationRound || 1;

            // KPI calculation logic
            const referenceTime = new Date(l.newInqTimestamp || l.updatedAt || l.createdAt);
            const hoursPassed = (now - referenceTime) / (1000 * 60 * 60);
            const daysPassed = hoursPassed / 24;

            let isDelayed = false;
            if (hoursPassed >= 24 && l.phase === 1 && isPending) isDelayed = true;
            if (daysPassed >= 5 && !isEnrolled && round < 2) isDelayed = true;
            if (daysPassed >= 10 && !isEnrolled && round < 3) isDelayed = true;

            if (isEnrolled) totalEnrolled++;

            if (l.assignedTo) {
                totalAssigned++;
                if (isContacted) totalContacted++;
                if (isPending) totalPending++;
                if (isDelayed) totalDelayed++;

                const staffName = l.assignedUser ? `${l.assignedUser.firstName} ${l.assignedUser.lastName}` : `Unknown Staff`;
                
                // 🔥 Initialize Staff Object if not exists 🔥
                if (!staffMap[staffName]) {
                    staffMap[staffName] = { 
                        name: staffName, 
                        overall: { assigned: 0, contacted: 0, pending: 0, enrolled: 0, delayed: 0 },
                        rounds: {
                            1: { assigned: 0, contacted: 0, pending: 0, delayed: 0, leads: [] },
                            2: { assigned: 0, contacted: 0, pending: 0, delayed: 0, leads: [] },
                            3: { assigned: 0, contacted: 0, pending: 0, delayed: 0, leads: [] },
                            PAID: { assigned: 0, contacted: 0, pending: 0, leads: [] }
                        }
                    };
                }

                // 🔥 Overall Stats Update 🔥
                staffMap[staffName].overall.assigned++;
                if (isContacted) staffMap[staffName].overall.contacted++;
                if (isPending) staffMap[staffName].overall.pending++;
                if (isEnrolled) staffMap[staffName].overall.enrolled++;
                if (isDelayed) staffMap[staffName].overall.delayed++;

                // Prepare Lead Object for Export (Inside the rows)
                const exportLead = {
                    id: l.id,
                    phone: l.phone ? l.phone.split('_')[0] : '', 
                    name: l.name || 'Unknown',
                    phase: l.phase || 1,
                    status: l.callStatus || 'pending',
                    enrolled: l.enrollmentStatus || 'NON_ENROLLED',
                    remark: l.feedback || 'No Remark'
                };

                // 🔥 Round-wise Stats Update & Lead Pushing 🔥
                if (isEnrolled) {
                    staffMap[staffName].rounds.PAID.assigned++;
                    if (isContacted) staffMap[staffName].rounds.PAID.contacted++;
                    if (isPending) staffMap[staffName].rounds.PAID.pending++;
                    staffMap[staffName].rounds.PAID.leads.push(exportLead);
                } else {
                    // Make sure custom rounds (>3) don't crash
                    if (!staffMap[staffName].rounds[round]) {
                        staffMap[staffName].rounds[round] = { assigned: 0, contacted: 0, pending: 0, delayed: 0, leads: [] };
                    }
                    staffMap[staffName].rounds[round].assigned++;
                    if (isContacted) staffMap[staffName].rounds[round].contacted++;
                    if (isPending) staffMap[staffName].rounds[round].pending++;
                    if (isDelayed) staffMap[staffName].rounds[round].delayed++;
                    staffMap[staffName].rounds[round].leads.push(exportLead);
                }
            }
        });

        // 🔥 Raw Leads for Master Export Modal 🔥
        const rawLeadsForExport = leads.map(l => ({
            id: l.id,
            phone: l.phone ? l.phone.split('_')[0] : '', // Clean Phone
            name: l.name || 'Unknown',
            assignedToName: l.assignedUser ? `${l.assignedUser.firstName} ${l.assignedUser.lastName}` : 'Unassigned',
            round: l.coordinationRound || 1,
            phase: l.phase || 1,
            callStatus: l.callStatus || 'pending',
            enrollmentStatus: l.enrollmentStatus || 'NON_ENROLLED',
            paymentPlan: l.paymentIntention || 'NOT_DECIDED',
            remark: l.feedback || 'No Remark'
        }));

        res.status(200).json({ 
            totalNewInq, totalAssigned, totalContacted, totalPending, totalEnrolled, totalDelayed, 
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
            include: { assignedUser: { select: { firstName: true, lastName: true } } }
        });

        // Bridge Transfers අනිවාර්යයෙන්ම අයින් කරන්න
        leads = leads.filter(l => l.source !== 'bridge_transfer');

        const verifiedPhones = await getVerifiedPhones(businessId, batchId);

        let totalOpenSem = leads.length;
        let totalAssigned = 0; 
        let totalContacted = 0; 
        let totalPending = 0; 
        let totalEnrolled = 0; 
        let totalDelayed = 0;
        let staffMap = {};
        
        const now = new Date();

        leads.forEach(l => {
            const isPending = l.callStatus === 'pending' || !l.callStatus;
            
            const cleanPhone = l.phone ? l.phone.split('_')[0].replace(/[^0-9]/g, '') : '';
            const isReallyEnrolled = cleanPhone.length >= 7 && verifiedPhones.has(cleanPhone.slice(-7));
            const isEnrolled = isReallyEnrolled;
            
            const isContacted = !isPending;
            const round = l.coordinationRound || 1;

            const referenceTime = new Date(l.newInqTimestamp || l.updatedAt || l.createdAt);
            const hoursPassed = (now - referenceTime) / (1000 * 60 * 60);
            const daysPassed = hoursPassed / 24;

            let isDelayed = false;
            if (hoursPassed >= 24 && l.phase === 1 && isPending) isDelayed = true;
            if (daysPassed >= 5 && !isEnrolled && round < 2) isDelayed = true;
            if (daysPassed >= 10 && !isEnrolled && round < 3) isDelayed = true;

            if (isEnrolled) totalEnrolled++;

            if (l.assignedTo) {
                totalAssigned++;
                if (isContacted) totalContacted++;
                if (isPending) totalPending++;
                if (isDelayed) totalDelayed++;

                const staffName = l.assignedUser ? `${l.assignedUser.firstName} ${l.assignedUser.lastName}` : `Unknown Staff`;
                
                // Initialize Staff Object if not exists
                if (!staffMap[staffName]) {
                    staffMap[staffName] = { 
                        name: staffName, 
                        overall: { assigned: 0, contacted: 0, pending: 0, enrolled: 0, delayed: 0 },
                        rounds: {
                            1: { assigned: 0, contacted: 0, pending: 0, delayed: 0, leads: [] },
                            2: { assigned: 0, contacted: 0, pending: 0, delayed: 0, leads: [] },
                            3: { assigned: 0, contacted: 0, pending: 0, delayed: 0, leads: [] },
                            PAID: { assigned: 0, contacted: 0, pending: 0, leads: [] }
                        }
                    };
                }

                // Overall Stats Update
                staffMap[staffName].overall.assigned++;
                if (isContacted) staffMap[staffName].overall.contacted++;
                if (isPending) staffMap[staffName].overall.pending++;
                if (isEnrolled) staffMap[staffName].overall.enrolled++;
                if (isDelayed) staffMap[staffName].overall.delayed++;

                // Prepare Lead Object for Export
                const exportLead = {
                    id: l.id,
                    phone: l.phone.split('_')[0], // Clean Phone
                    name: l.name || 'Unknown',
                    phase: l.phase || 1,
                    status: l.callStatus || 'pending',
                    enrolled: l.enrollmentStatus,
                    remark: l.feedback || 'No Remark'
                };

                // Round-wise Stats Update & Lead Pushing
                if (isEnrolled) {
                    staffMap[staffName].rounds.PAID.assigned++;
                    if (isContacted) staffMap[staffName].rounds.PAID.contacted++;
                    if (isPending) staffMap[staffName].rounds.PAID.pending++;
                    staffMap[staffName].rounds.PAID.leads.push(exportLead);
                } else if (round <= 3) {
                    staffMap[staffName].rounds[round].assigned++;
                    if (isContacted) staffMap[staffName].rounds[round].contacted++;
                    if (isPending) staffMap[staffName].rounds[round].pending++;
                    if (isDelayed) staffMap[staffName].rounds[round].delayed++;
                    staffMap[staffName].rounds[round].leads.push(exportLead);
                }
            }
        });

        // 🔥 අලුතෙන් එකතු කරපු කෑල්ල: Export එකට ඕන කරන මුළු Lead Data එකම හදනවා 🔥
        const rawLeadsForExport = leads.map(l => ({
            id: l.id,
            phone: l.phone ? l.phone.split('_')[0] : '', // Clean Phone
            name: l.name || 'Unknown',
            assignedToName: l.assignedUser ? `${l.assignedUser.firstName} ${l.assignedUser.lastName}` : 'Unassigned',
            round: l.coordinationRound || 1,
            phase: l.phase || 1,
            callStatus: l.callStatus || 'pending',
            enrollmentStatus: l.enrollmentStatus || 'NON_ENROLLED',
            paymentPlan: l.paymentIntention || 'NOT_DECIDED',
            remark: l.feedback || 'No Remark'
        }));

        res.status(200).json({ 
            totalOpenSem, totalAssigned, totalContacted, totalPending, totalEnrolled, totalDelayed, 
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
            include: { assignedUser: { select: { firstName: true, lastName: true } } }
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

        let totalTransferred = leads.length;
        let totalContacted = 0; let totalPending = 0; let totalEnrolled = 0;
        let staffMap = {};

        leads.forEach(l => {
            const isPending = l.callStatus === 'pending' || !l.callStatus;
            
            const cleanPhone = l.phone ? l.phone.split('_')[0].replace(/[^0-9]/g, '') : '';
            const isReallyEnrolled = cleanPhone.length >= 7 && verifiedPhones.has(cleanPhone.slice(-7));
            const isEnrolled = isReallyEnrolled;
            
            const isContacted = !isPending;

            if (isContacted) totalContacted++;
            if (isPending) totalPending++;
            if (isEnrolled) totalEnrolled++;

            if (l.assignedTo) {
                const staffName = l.assignedUser ? `${l.assignedUser.firstName} ${l.assignedUser.lastName}` : `Unknown`;
                if (!staffMap[staffName]) {
                    staffMap[staffName] = { name: staffName, assigned: 0, contacted: 0, pending: 0, enrolled: 0 };
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
            campaignType: 'AFTER_SEMINAR', enrollmentStatus: 'ENROLLED' 
        });

        const leads = await prisma.lead.findMany({
            where: whereClause,
            include: { assignedUser: { select: { firstName: true, lastName: true } } }
        });

        const verifiedPhones = await getVerifiedPhones(businessId, batchId);

        const activeLeads = leads.filter(l => {
            if (!l.phone) return false;
            const cleanPhone = l.phone.split('_')[0].replace(/[^0-9]/g, '');
            return cleanPhone.length >= 7 && verifiedPhones.has(cleanPhone.slice(-7));
        });

        let totalPaidLeads = activeLeads.length;
        let totalContacted = 0; let totalPending = 0;
        let staffMap = {};

        activeLeads.forEach(l => {
            const isPending = l.callStatus === 'pending' || !l.callStatus;
            const isContacted = !isPending;

            if (isContacted) totalContacted++;
            if (isPending) totalPending++;

            if (l.assignedTo) {
                const staffName = l.assignedUser ? `${l.assignedUser.firstName} ${l.assignedUser.lastName}` : `Unknown Staff`;
                if (!staffMap[staffName]) {
                    staffMap[staffName] = { name: staffName, assigned: 0, contacted: 0, pending: 0 };
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