const { PrismaClient } = require('@prisma/client');
const prisma = require('../src/core/db');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, AlignmentType, WidthType, ShadingType } = require('docx');
const { isOpenSeminarLocked } = require('./afterSeminarInquiryController');

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
    const paymentWhere = { status: 1, amount: { gt: 0 } };
    if (batchId && batchId !== 'ALL' && batchId !== 'undefined' && batchId !== 'null') {
        paymentWhere.batchId = parseInt(batchId);
    } else if (businessId && businessId !== 'ALL' && businessId !== 'undefined' && businessId !== 'null') {
        paymentWhere.businessId = parseInt(businessId);
    }

    const verifiedPayments = await prisma.payment.findMany({
        where: paymentWhere,
        include: { student: true, group: true }
    });

    const verifiedPhones = new Set();
    const phoneSuffixToStudentId = {};
    const phoneSuffixToPaymentType = {};
    verifiedPayments.forEach(p => {
        if (p.student) {
            const stu = p.student;
            const isFull = p.payment_type === 3 || (p.group?.name && p.group.name.toUpperCase().includes('FULL'));
            const isUpgrade = p.payment_type === 4 || (p.group?.name && p.group.name.toUpperCase().includes('UPGRADE'));
            const isInstallment = p.payment_type === 2 || (p.group?.name && p.group.name.toUpperCase().includes('INSTALLMENT'));
            const typeStr = isFull ? 'FULL' : (isUpgrade ? 'UPGRADE' : (isInstallment ? 'INSTALLMENT' : 'MONTHLY'));

            [stu.phone, stu.whatsapp, stu.optionalPhone].forEach(ph => {
                if (!ph) return;
                const cleanPh = ph.replace(/[^0-9]/g, '');
                if (cleanPh.length >= 9) {
                    const s9 = cleanPh.slice(-9);
                    verifiedPhones.add(s9);
                    phoneSuffixToStudentId[s9] = stu.id;
                    phoneSuffixToPaymentType[s9] = typeStr;
                }
                if (cleanPh.length >= 7) {
                    const s7 = cleanPh.slice(-7);
                    verifiedPhones.add(s7);
                    phoneSuffixToStudentId[s7] = stu.id;
                    phoneSuffixToPaymentType[s7] = typeStr;
                }
            });
        }
    });

    verifiedPhones.studentIdMap = phoneSuffixToStudentId;
    verifiedPhones.paymentTypeMap = phoneSuffixToPaymentType;
    return verifiedPhones;
};


// ==========================================
// BUSINESS & STAFF SCOPING HELPERS
// ==========================================
const isCallCenterUser = (u) => {
    if (!u) return false;
    const role = String(u.role || '').toUpperCase().replace(/[ -]/g, '_');
    const dept = String(u.department || '').toUpperCase().replace(/[ -]/g, '_');
    return role.includes('CALL_CENTER') || role.includes('CALLER') || role.includes('TELECALLER') || dept.includes('CALL_CENTER');
};

// 🔥 Helper: Get primary enrolled lead IDs to prevent duplicates across campaigns 🔥
const getPrimaryEnrolledLeadIds = async (businessId, batchId, verifiedPhones) => {
    const whereClause = buildStatsWhereClause(businessId, batchId, null, null, {
        campaignType: 'AFTER_SEMINAR',
        source: { notIn: ['bridge_transfer', 'system'] },
        inquiryType: { in: ['OPEN_SEMINAR', 'NORMAL', 'NEW_INQ'] }
    });
    const allLeads = await prisma.lead.findMany({
        where: whereClause,
        select: {
            id: true,
            phone: true,
            createdAt: true,
            assignedUser: { select: { id: true, role: true, department: true } }
        }
    });

    const coordinatorLeads = allLeads.filter(l => !isCallCenterUser(l.assignedUser));

    const phoneSuffixToStudentId = verifiedPhones.studentIdMap || {};
    const studentToLeads = {};
    coordinatorLeads.forEach(l => {
        const cleanPhone = l.phone ? l.phone.split('_')[0].replace(/[^0-9]/g, '') : '';
        const suf = cleanPhone.length >= 9 ? cleanPhone.slice(-9) : (cleanPhone.length >= 7 ? cleanPhone.slice(-7) : null);
        if (suf && verifiedPhones.has(suf)) {
            const studentId = phoneSuffixToStudentId[suf];
            if (studentId) {
                if (!studentToLeads[studentId]) studentToLeads[studentId] = [];
                studentToLeads[studentId].push(l);
            }
        }
    });

    const primaryLeadIds = new Set();
    Object.values(studentToLeads).forEach(group => {
        group.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Latest genuine coordinator lead gets the enrollment
        primaryLeadIds.add(group[0].id);
    });

    return primaryLeadIds;
};

// 🔥 MULTI-BATCH HELPERS (one chat room, many batches) 🔥
const { getApprovedBatchPhoneSet, isPaidForBatch } = require('../utils/leadBatchAssignments');

// Leads that also have EXTRA batches: their primary coordinator only gets enrollment credit for a
// payment in the lead's own (primary) batch, so an extra batch's payment is not counted twice.
const buildMultiBatchGuard = async (leads) => {
    const guard = { ids: new Set(), paidSet: new Set() };
    guard.has = (id) => guard.ids.has(id);
    guard.primaryPaid = (l) => isPaidForBatch(guard.paidSet, l.phone, l.batchId) || l.enrollmentStatus === 'ENROLLED' || l.enrollmentStatus === 'PAID';
    const ids = (leads || []).map(l => l.id);
    if (ids.length === 0) return guard;
    const rows = await prisma.leadBatchAssignment.findMany({ where: { leadId: { in: ids } }, select: { leadId: true, batchId: true } });
    const primary = new Map((leads || []).map(l => [l.id, l.batchId]));
    rows.forEach(r => { if (primary.get(r.leadId) !== r.batchId) guard.ids.add(r.leadId); });
    const primaryBatchIds = [...new Set((leads || []).filter(l => guard.ids.has(l.id) && l.batchId).map(l => l.batchId))];
    if (primaryBatchIds.length > 0) guard.paidSet = await getApprovedBatchPhoneSet({ batchIds: primaryBatchIds });
    return guard;
};

const zeroLike = (obj) => {
    if (Array.isArray(obj)) return [];
    if (obj && typeof obj === 'object') {
        const out = {};
        Object.keys(obj).forEach(k => { out[k] = zeroLike(obj[k]); });
        return out;
    }
    return typeof obj === 'number' ? 0 : obj;
};

// Adds EXTRA-batch rows in scope to the coordinator stats (assigned +1, enrolled +1 if paid in THAT batch).
const applyExtraBatchCredits = async ({ businessId, batchId, startDate, endDate, inquiryTypes, staffMap }) => {
    const where = { assignedTo: { not: null }, lead: { campaignType: 'AFTER_SEMINAR', inquiryType: { in: inquiryTypes }, NOT: { source: 'bridge_transfer' } } };
    const hasBatch = batchId && batchId !== 'ALL' && batchId !== 'UNASSIGNED' && !isNaN(parseInt(batchId));
    if (hasBatch) where.batchId = parseInt(batchId);
    else if (businessId && businessId !== 'ALL' && !isNaN(parseInt(businessId))) where.batch = { businessId: parseInt(businessId) };
    else if (batchId === 'UNASSIGNED') return { assigned: 0, enrolled: 0 };
    if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const rows = await prisma.leadBatchAssignment.findMany({
        where,
        include: {
            lead: { select: { id: true, phone: true, batchId: true } },
            assignedUser: { select: { id: true, firstName: true, lastName: true, businessType: true, role: true, image: true, appChatDp: true } }
        }
    });
    const valid = rows.filter(r => r.lead && r.lead.batchId !== r.batchId);
    if (valid.length === 0) return { assigned: 0, enrolled: 0 };

    const paidSet = await getApprovedBatchPhoneSet({ batchIds: [...new Set(valid.map(r => r.batchId))] });
    const template = Object.values(staffMap)[0];
    let assigned = 0, enrolled = 0;

    valid.forEach(r => {
        const u = r.assignedUser;
        const staffName = u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : `Staff #${r.assignedTo}`;
        if (!staffMap[staffName]) {
            const base = template ? zeroLike(template) : { overall: { assigned: 0, contacted: 0, answered: 0, noAnswer: 0, reject: 0, pending: 0, directPaid: 0, enrolled: 0, delayed: 0 } };
            staffMap[staffName] = {
                ...base,
                staffId: u?.id || r.assignedTo, id: u?.id || r.assignedTo,
                firstName: u?.firstName || '', lastName: u?.lastName || '',
                name: staffName, image: u?.image || u?.appChatDp || null,
                businessType: u?.businessType, role: u?.role
            };
        }
        const st = staffMap[staffName];
        st.overall = st.overall || {};
        const paid = isPaidForBatch(paidSet, r.lead.phone, r.batchId);
        st.overall.assigned = (st.overall.assigned || 0) + 1;
        st.overall.extraBatchAssigned = (st.overall.extraBatchAssigned || 0) + 1;
        assigned++;
        if (paid) {
            st.overall.enrolled = (st.overall.enrolled || 0) + 1;
            st.overall.extraBatchEnrolled = (st.overall.extraBatchEnrolled || 0) + 1;
            enrolled++;
        }
    });
    return { assigned, enrolled };
};

// 🔥 STRICT HELPER: Fixed BIZ_ and BATCH_ string format to prevent cross-business bleeding 🔥
const buildStatsWhereClause = (businessId, batchId, startDate, endDate, baseConditions = {}) => {
    let whereClause = { ...baseConditions };

    const isBatchAll = !batchId || String(batchId).trim().toUpperCase() === 'ALL' || batchId === 'undefined' || batchId === 'null' || batchId === '';
    const isBizAll = !businessId || String(businessId).trim().toUpperCase() === 'ALL' || businessId === 'undefined' || businessId === 'null' || businessId === '';

    const hasBatch = !isBatchAll && batchId !== 'UNASSIGNED' && !isNaN(parseInt(batchId));
    const hasBiz = !isBizAll && !isNaN(parseInt(businessId));

    if (batchId === 'UNASSIGNED') {
        whereClause.batchId = null;
        if (hasBiz) {
            const bizId = parseInt(businessId);
            whereClause.OR = [
                { phone: { endsWith: `_BIZ_${bizId}` } },
                { phone: { endsWith: `_BIZ_${bizId}_AS` } },
                { phone: { contains: `_BIZ_${bizId}_BATCH_` } },
                { phone: { contains: `_BIZ_${bizId}_ROUND_` } },
                { phone: { contains: `_BIZ_${bizId}_HISTORY_ROUND_` } }
            ];
        }
    } else if (hasBatch) {
        const bId = parseInt(batchId);
        if (hasBiz) {
            const bizId = parseInt(businessId);
            whereClause.OR = [
                { batchId: bId, batch: { businessId: bizId } },
                {
                    batchId: null,
                    OR: [
                        { phone: { endsWith: `_BATCH_${bId}` } },
                        { phone: { contains: `_BATCH_${bId}_` } }
                    ],
                    AND: [
                        {
                            OR: [
                                { phone: { endsWith: `_BIZ_${bizId}` } },
                                { phone: { endsWith: `_BIZ_${bizId}_AS` } },
                                { phone: { contains: `_BIZ_${bizId}_BATCH_` } },
                                { phone: { contains: `_BIZ_${bizId}_ROUND_` } },
                                { phone: { contains: `_BIZ_${bizId}_HISTORY_ROUND_` } }
                            ]
                        }
                    ]
                }
            ];
        } else {
            whereClause.OR = [
                { batchId: bId },
                { batchId: null, phone: { endsWith: `_BATCH_${bId}` } },
                { batchId: null, phone: { contains: `_BATCH_${bId}_` } }
            ];
        }
    } else if (hasBiz) {
        const bizId = parseInt(businessId);
        whereClause.OR = [
            { batch: { businessId: bizId } },
            {
                batchId: null,
                OR: [
                    { phone: { endsWith: `_BIZ_${bizId}` } },
                    { phone: { endsWith: `_BIZ_${bizId}_AS` } },
                    { phone: { contains: `_BIZ_${bizId}_BATCH_` } },
                    { phone: { contains: `_BIZ_${bizId}_ROUND_` } },
                    { phone: { contains: `_BIZ_${bizId}_HISTORY_ROUND_` } }
                ]
            }
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

const getLast9Digits = (phone) => {
    if (!phone) return '';
    const basePhone = String(phone).split('_')[0];
    const cleaned = basePhone.replace(/[^0-9]/g, '');
    return cleaned.slice(-9);
};

// 🔥 SHARED HELPER: Verified Paid Students Not in CRM (Unified with Retention / Paid Campaign logic) 🔥
const computeVerifiedMissingStudents = async (businessId, batchId) => {
    let batchIdsToFetch = [];
    if (batchId && batchId !== '' && batchId !== 'ALL' && batchId !== 'UNASSIGNED' && batchId !== 'undefined' && batchId !== 'null') {
        batchIdsToFetch = [parseInt(batchId)];
    } else if (businessId && businessId !== '' && businessId !== 'ALL' && businessId !== 'undefined' && businessId !== 'null') {
        const bizBatches = await prisma.batch.findMany({ where: { businessId: parseInt(businessId) }, select: { id: true } });
        batchIdsToFetch = bizBatches.map(b => b.id);
    }

    const payments = await prisma.payment.findMany({
        where: { batchId: { in: batchIdsToFetch }, status: 1, amount: { gt: 0 } },
        select: {
            id: true, payment_type: true, groupId: true, businessId: true, batchId: true, amount: true,
            student: { select: { id: true, firstName: true, lastName: true, phone: true, whatsapp: true, optionalPhone: true, nic: true } },
            batch: { select: { name: true } }
        }
    });

    const crmWhereClauseOverall = buildStatsWhereClause(businessId, batchId, null, null, {
        campaignType: 'AFTER_SEMINAR',
        source: { notIn: ['bridge_transfer', 'system'] },
        inquiryType: { in: ['OPEN_SEMINAR', 'NORMAL', 'NEW_INQ'] }
    });
    const allCrmLeads = await prisma.lead.findMany({
        where: crmWhereClauseOverall,
        select: {
            id: true,
            phone: true,
            assignedUser: { select: { id: true, role: true, department: true } }
        }
    });
    const coordLeads = allCrmLeads.filter(l => !isCallCenterUser(l.assignedUser));

    const phoneLeadSet = new Set();
    coordLeads.forEach(l => {
        const raw = l.phone.split('_')[0].replace(/[^0-9]/g, '');
        if (raw.length >= 9) phoneLeadSet.add(raw.slice(-9));
        if (raw.length >= 7) phoneLeadSet.add(raw.slice(-7));
    });

    const paymentStudentsMap = new Map();
    payments.forEach(p => { 
        if (p.student) paymentStudentsMap.set(p.student.id, { ...p.student, batchName: p.batch?.name || '', amountPaid: p.amount }); 
    });

    let notInCrmStudents = [];
    paymentStudentsMap.forEach(student => {
        const phs = [student.phone, student.whatsapp, student.optionalPhone].filter(Boolean);
        let isMatchedInCrm = false;
        for (const ph of phs) {
            const clean = String(ph).replace(/[^0-9]/g, '');
            if (clean.length >= 9 && phoneLeadSet.has(clean.slice(-9))) {
                isMatchedInCrm = true;
                break;
            }
            if (clean.length >= 7 && phoneLeadSet.has(clean.slice(-7))) {
                isMatchedInCrm = true;
                break;
            }
        }

        if (!isMatchedInCrm) {
            notInCrmStudents.push({
                id: student.id,
                studentId: student.id,
                name: student.firstName ? `${student.firstName} ${student.lastName || ''}`.trim() : 'Unknown',
                phone: student.phone || student.whatsapp || student.optionalPhone || 'N/A',
                nic: student.nic || '',
                batchName: student.batchName || '',
                amountPaid: student.amountPaid || 0
            });
        }
    });

    return notInCrmStudents;
};

// ==========================================
// BUSINESS & STAFF SCOPING HELPERS
// ==========================================

const resolveTargetBizName = async (businessId, batchId) => {
    try {
        if (businessId && businessId !== 'ALL' && !isNaN(parseInt(businessId))) {
            const b = await prisma.business.findUnique({
                where: { id: parseInt(businessId) },
                select: { id: true, name: true }
            });
            if (b) return String(b.name || '').toLowerCase().trim();
        } else if (batchId && batchId !== 'ALL' && !isNaN(parseInt(batchId))) {
            const bt = await prisma.batch.findUnique({
                where: { id: parseInt(batchId) },
                select: { businessId: true, business: { select: { name: true } } }
            });
            if (bt?.business) return String(bt.business.name || '').toLowerCase().trim();
        }
    } catch (e) {
        console.error("resolveTargetBizName error:", e);
    }
    return '';
};

const isStaffInBusiness = (u, targetBizId, targetBizName) => {
    if (!u) return false;
    if (isCallCenterUser(u)) return false;

    // If no target business specified (e.g. ALL), any coordinator is allowed
    if (!targetBizName && (!targetBizId || targetBizId === 'ALL')) return true;

    const userBiz = String(u.businessType || '').toLowerCase().trim();
    if (!userBiz) return false;

    // Allow top-level campus-wide managers
    if (userBiz === 'all' || userBiz === 'ima campus' || userBiz === 'campus') return true;

    const targetName = String(targetBizName || '').toLowerCase().trim();
    const targetIdStr = targetBizId && targetBizId !== 'ALL' ? String(targetBizId).trim() : '';

    const staffBizList = userBiz.split(',').map(b => b.trim().toLowerCase()).filter(Boolean);

    return staffBizList.some(b => {
        if (targetIdStr && b === targetIdStr) return true;
        if (targetName) {
            if (b === targetName) return true;
            const cleanB = b.replace(/[\s\-_/\\|]+/g, '');
            const cleanTarget = targetName.replace(/[\s\-_/\\|]+/g, '');
            if (cleanB === cleanTarget) return true;
        }
        return false;
    });
};

// ==========================================
// 1. OVERALL PROGRESS STATS (INTEGRATED WITH OPEN SEMINAR & NEW INQUIRIES)
// ==========================================
exports.getManagerDashboardStats = async (req, res) => {
    try {
        const { businessId, batchId, startDate, endDate } = req.query;

        let courseWhere = {};
        const paymentWhere = { status: 1, amount: { gt: 0 } };
        if (batchId && batchId !== 'ALL' && batchId !== 'undefined' && batchId !== 'null') {
            paymentWhere.batchId = parseInt(batchId);
            const batchGroups = await prisma.group.findMany({ where: { batchId: parseInt(batchId) }, select: { id: true } });
            courseWhere.groupId = { in: batchGroups.map(g => g.id) };
        } else if (businessId && businessId !== 'ALL' && businessId !== 'undefined' && businessId !== 'null') {
            paymentWhere.businessId = parseInt(businessId);
            const bizBatches = await prisma.batch.findMany({ where: { businessId: parseInt(businessId) }, select: { id: true } });
            const bizGroups = await prisma.group.findMany({ where: { batchId: { in: bizBatches.map(b => b.id) } }, select: { id: true } });
            courseWhere.groupId = { in: bizGroups.map(g => g.id) };
        }

        // 1. Fetch Open Seminar Stats using the exact getOpenSeminarStats handler logic
        let openSemData = {};
        await exports.getOpenSeminarStats(req, {
            status: () => ({ json: (d) => { openSemData = d; } }),
            json: (d) => { openSemData = d; }
        });

        // 2. Fetch New Inquiries Stats using the exact getNewInquiryStats handler logic
        let newInqData = {};
        await exports.getNewInquiryStats(req, {
            status: () => ({ json: (d) => { newInqData = d; } }),
            json: (d) => { newInqData = d; }
        });

        // 3. Verified Missing Paid Web Students
        const verifiedStudentsNotInCrm = await computeVerifiedMissingStudents(businessId, batchId);

        // 4. Calculate Payment Plan and Status aggregates for Open Seminar
        let openSemFull = 0, openSemUpgrade = 0, openSemMonthly = 0, openSemInstallment = 0;
        let openSemAnswered = 0, openSemNoAnswer = 0, openSemReject = 0;
        (openSemData.staffBreakdown || []).forEach(s => {
            openSemFull += (s.overall?.full || 0);
            openSemUpgrade += (s.overall?.upgrade || 0);
            openSemMonthly += (s.overall?.monthly || 0);
            openSemInstallment += (s.overall?.installment || 0);
            openSemAnswered += (s.overall?.answered || 0);
            openSemNoAnswer += (s.overall?.noAnswer || 0);
            openSemReject += (s.overall?.reject || 0);
        });

        // 5. Calculate Payment Plan and Status aggregates for New Inquiries
        let newInqFull = 0, newInqUpgrade = 0, newInqMonthly = 0, newInqInstallment = 0;
        let newInqAnswered = 0, newInqNoAnswer = 0, newInqReject = 0;
        (newInqData.staffBreakdown || []).forEach(s => {
            newInqFull += (s.overall?.full || 0);
            newInqUpgrade += (s.overall?.upgrade || 0);
            newInqMonthly += (s.overall?.monthly || 0);
            newInqInstallment += (s.overall?.installment || 0);
            newInqAnswered += (s.overall?.answered || 0);
            newInqNoAnswer += (s.overall?.noAnswer || 0);
            newInqReject += (s.overall?.reject || 0);
        });

        const openSemTotalLeads = openSemData.totalOpenSem || 0;
        const openSemAssigned = openSemData.totalAssigned || 0;
        const openSemEnrolled = openSemData.totalEnrolled || 0;
        const openSemConversionRate = openSemAssigned > 0 ? Math.round((openSemEnrolled / openSemAssigned) * 100) : 0;

        const newInqTotalLeads = newInqData.totalNewInq || 0;
        const newInqAssigned = newInqData.totalAssigned || 0;
        const newInqEnrolled = newInqData.totalEnrolled || 0;
        const newInqConversionRate = newInqAssigned > 0 ? Math.round((newInqEnrolled / newInqAssigned) * 100) : 0;

        const combinedTotalLeads = openSemTotalLeads + newInqTotalLeads;
        const combinedAssignedLeads = openSemAssigned + newInqAssigned;
        const combinedTotalEnrolled = openSemEnrolled + newInqEnrolled;
        const combinedConversionRate = combinedAssignedLeads > 0 ? Math.round((combinedTotalEnrolled / combinedAssignedLeads) * 100) : 0;

        // 6. Build Unified Staff Breakdown Map
        const staffMap = {};
        const mergeStaffIntoMap = (staffList) => {
            (staffList || []).forEach(staff => {
                const sName = staff.name || `${staff.firstName || ''} ${staff.lastName || ''}`.trim() || `Staff #${staff.staffId || staff.id}`;
                if (!staffMap[sName]) {
                    staffMap[sName] = {
                        id: staff.id || staff.staffId,
                        staffId: staff.id || staff.staffId,
                        name: sName,
                        firstName: staff.firstName || '',
                        lastName: staff.lastName || '',
                        businessType: staff.businessType || 'OTHER',
                        role: staff.role || 'COORDINATOR',
                        image: staff.image || staff.appChatDp || null,
                        appChatDp: staff.appChatDp || null,
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

                const target = staffMap[sName];
                if (staff.image && !target.image) target.image = staff.image;
                if (staff.appChatDp && !target.appChatDp) target.appChatDp = staff.appChatDp;
                if (staff.overall) {
                    target.overall.assigned += (staff.overall.assigned || 0);
                    target.overall.contacted += (staff.overall.contacted || 0);
                    target.overall.answered += (staff.overall.answered || 0);
                    target.overall.noAnswer += (staff.overall.noAnswer || 0);
                    target.overall.reject += (staff.overall.reject || 0);
                    target.overall.pending += (staff.overall.pending || 0);
                    target.overall.delayed += (staff.overall.delayed || 0);
                    target.overall.enrolled += (staff.overall.enrolled || 0);
                    target.overall.full += (staff.overall.full || 0);
                    target.overall.upgrade += (staff.overall.upgrade || 0);
                    target.overall.monthly += (staff.overall.monthly || 0);
                    target.overall.installment += (staff.overall.installment || 0);
                    target.overall.directPaid += (staff.overall.directPaid || 0);
                    target.overall.r1HistoricalDelays += (staff.overall.r1HistoricalDelays || 0);
                    target.overall.r2HistoricalDelays += (staff.overall.r2HistoricalDelays || 0);
                }

                if (staff.rounds) {
                    ['1', '2', 'NON_ENROLLED', 'PAID'].forEach(rKey => {
                        if (staff.rounds[rKey]) {
                            target.rounds[rKey].assigned += (staff.rounds[rKey].assigned || 0);
                            target.rounds[rKey].contacted += (staff.rounds[rKey].contacted || 0);
                            target.rounds[rKey].answered += (staff.rounds[rKey].answered || 0);
                            target.rounds[rKey].noAnswer += (staff.rounds[rKey].noAnswer || 0);
                            target.rounds[rKey].reject += (staff.rounds[rKey].reject || 0);
                            target.rounds[rKey].pending += (staff.rounds[rKey].pending || 0);
                            target.rounds[rKey].delayed += (staff.rounds[rKey].delayed || 0);
                        }
                    });
                }
            });
        };

        mergeStaffIntoMap(openSemData.staffBreakdown);
        mergeStaffIntoMap(newInqData.staffBreakdown);

        // 7. Populate Mixer & Subject Enrollment Data (Using real verified payments)
        const allCourses = await prisma.course.findMany({ select: { id: true, name: true } });
        const globalCourseMap = {};
        allCourses.forEach(c => globalCourseMap[c.id] = c.name.trim().toUpperCase());

        const realCourses = await prisma.course.findMany({ where: courseWhere, select: { id: true, name: true } });
        const subjectAggregates = {};
        realCourses.forEach(c => {
            const upName = c.name.trim().toUpperCase();
            subjectAggregates[upName] = { id: c.id, subject: c.name, full: 0, monthly: 0, installment: 0, totalEnrolled: 0 };
        });

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

        // 8. Batch Goals
        let batchGoals = openSemData.batchGoals || { targetIndividualGoal: 40, targetGroupGoal: 50 };

        res.status(200).json({
            totalLeads: combinedTotalLeads,
            assignedLeads: combinedAssignedLeads,
            unassignedLeads: 0,
            openSemLeads: openSemTotalLeads,
            newInqLeads: newInqTotalLeads,
            bridgeLeads: 0,
            conversionRate: combinedConversionRate,
            totalContacted: (openSemData.totalContacted || 0) + (newInqData.totalContacted || 0),
            totalAnswered: openSemAnswered + newInqAnswered,
            totalNoAnswer: openSemNoAnswer + newInqNoAnswer,
            totalReject: openSemReject + newInqReject,
            totalPending: (openSemData.totalPending || 0) + (newInqData.totalPending || 0),
            totalDirectPaid: (openSemData.totalDirectPaid || 0) + (newInqData.totalDirectPaid || 0),
            totalEnrolled: combinedTotalEnrolled,
            totalDelayed: (openSemData.totalDelayed || 0) + (newInqData.totalDelayed || 0),
            openSemSummary: {
                totalLeads: openSemTotalLeads,
                assignedLeads: openSemAssigned,
                unassignedLeads: 0,
                contacted: openSemData.totalContacted || 0,
                answered: openSemAnswered,
                noAnswer: openSemNoAnswer,
                reject: openSemReject,
                pending: openSemData.totalPending || 0,
                delayed: openSemData.totalDelayed || 0,
                enrolled: openSemEnrolled,
                full: openSemFull,
                upgrade: openSemUpgrade,
                monthly: openSemMonthly,
                installment: openSemInstallment,
                directPaid: openSemData.totalDirectPaid || 0,
                conversionRate: openSemConversionRate,
                missingPaidCount: verifiedStudentsNotInCrm.length
            },
            newInqSummary: {
                totalLeads: newInqTotalLeads,
                assignedLeads: newInqAssigned,
                unassignedLeads: 0,
                contacted: newInqData.totalContacted || 0,
                answered: newInqAnswered,
                noAnswer: newInqNoAnswer,
                reject: newInqReject,
                pending: newInqData.totalPending || 0,
                delayed: newInqData.totalDelayed || 0,
                enrolled: newInqEnrolled,
                full: newInqFull,
                upgrade: newInqUpgrade,
                monthly: newInqMonthly,
                installment: newInqInstallment,
                directPaid: newInqData.totalDirectPaid || 0,
                conversionRate: newInqConversionRate,
                missingPaidCount: verifiedStudentsNotInCrm.length
            },
            staffBreakdown: Object.values(staffMap),
            staffBreakdownOpenSem: openSemData.staffBreakdown || [],
            staffBreakdownNewInq: newInqData.staffBreakdown || [],
            subjectEnrollments: Object.values(subjectAggregates),
            mixerData: realMixerData,
            realEnrollmentTotals: { full: realFullCount, monthly: realMonthlyCount, installment: realInstallCount, total: realTotalEnrolled },
            verifiedStudentsNotInCrm,
            batchGoals
        });
    } catch (error) {
        console.error("Manager Stats Error:", error);
        res.status(500).json({ error: "Failed to fetch manager stats" });
    }
};

// Update Batch Goals
// 🔥 Conversion goals per campaign. OPEN_SEM uses targetIndividualGoal/targetGroupGoal,
// NEW_INQ uses its own newInqTargetIndividualGoal/newInqTargetGroupGoal columns.
const getCampaignBatchGoals = async (businessId, batchId, campaign = 'OPEN_SEM') => {
    const isNewInq = campaign === 'NEW_INQ';
    const select = isNewInq
        ? { newInqTargetIndividualGoal: true, newInqTargetGroupGoal: true }
        : { targetIndividualGoal: true, targetGroupGoal: true };
    const toGoals = (b) => ({
        targetIndividualGoal: (isNewInq ? b?.newInqTargetIndividualGoal : b?.targetIndividualGoal) ?? 40,
        targetGroupGoal: (isNewInq ? b?.newInqTargetGroupGoal : b?.targetGroupGoal) ?? 50
    });
    try {
        if (batchId && batchId !== 'ALL' && batchId !== 'undefined' && batchId !== 'null' && !isNaN(parseInt(batchId))) {
            const b = await prisma.batch.findUnique({ where: { id: parseInt(batchId) }, select });
            if (b) return toGoals(b);
        } else if (businessId && businessId !== 'ALL' && businessId !== 'undefined' && businessId !== 'null' && !isNaN(parseInt(businessId))) {
            const b = await prisma.batch.findFirst({ where: { businessId: parseInt(businessId) }, select });
            if (b) return toGoals(b);
        }
    } catch (e) {
        console.error(`Batch goals fetch error (${campaign}):`, e);
    }
    return { targetIndividualGoal: 40, targetGroupGoal: 50 };
};

exports.updateBatchGoals = async (req, res) => {
    try {
        const { batchId, businessId, targetIndividualGoal, targetGroupGoal, campaign } = req.body;
        const indVal = parseFloat(targetIndividualGoal) || 40;
        const grpVal = parseFloat(targetGroupGoal) || 50;

        // campaign: 'NEW_INQ' -> New Inquiries goals, anything else -> Open Seminar goals (old behaviour)
        const goalData = campaign === 'NEW_INQ'
            ? { newInqTargetIndividualGoal: indVal, newInqTargetGroupGoal: grpVal }
            : { targetIndividualGoal: indVal, targetGroupGoal: grpVal };

        if (batchId && batchId !== 'ALL' && batchId !== 'undefined' && batchId !== 'null') {
            await prisma.batch.update({
                where: { id: parseInt(batchId) },
                data: goalData
            });
        }
        if (businessId && businessId !== 'ALL' && businessId !== 'undefined' && businessId !== 'null') {
            await prisma.batch.updateMany({
                where: { businessId: parseInt(businessId) },
                data: goalData
            });
        }

        res.status(200).json({
            success: true,
            message: "Batch conversion goals updated successfully!",
            batchGoals: { targetIndividualGoal: indVal, targetGroupGoal: grpVal }
        });
    } catch (error) {
        console.error("Update Batch Goals Error:", error);
        res.status(500).json({ error: "Failed to update batch conversion goals" });
    }
};

// ==========================================
// 2. NEW INQUIRIES STATS (ADVANCED WITH ROUND BREAKDOWN & RAW LEADS)
// ==========================================
exports.getNewInquiryStats = async (req, res) => {
    try {
        const { businessId, batchId, startDate, endDate } = req.query;
        const targetBizName = await resolveTargetBizName(businessId, batchId);

        const whereClause = buildStatsWhereClause(businessId, batchId, startDate, endDate, {
            campaignType: 'AFTER_SEMINAR', inquiryType: 'NEW_INQ'
        });

        let leads = await prisma.lead.findMany({
            where: whereClause,
            include: { assignedUser: { select: { id: true, firstName: true, lastName: true, businessType: true, role: true, department: true, image: true, appChatDp: true } } }
        });

        // 🔥 FIX: Bridge Transfers අනිවාර්යයෙන්ම අයින් කරන්න
        leads = leads.filter(l => l.source !== 'bridge_transfer');

        const verifiedPhones = await getVerifiedPhones(businessId, batchId);
        const primaryEnrolledLeadIds = await getPrimaryEnrolledLeadIds(businessId, batchId, verifiedPhones);
        const activeStaffIds = await getActiveStaffIds(businessId, batchId);

        // 🔥 AUTO-SYNC VERIFIED PAID LEADS TO 'ENROLLED' IN DB & DEMOTE UNVERIFIED 🔥
        if (primaryEnrolledLeadIds && primaryEnrolledLeadIds.size > 0) {
            const unsyncedIds = leads
                .filter(l => primaryEnrolledLeadIds.has(l.id) && l.enrollmentStatus !== 'ENROLLED')
                .map(l => l.id);
            if (unsyncedIds.length > 0) {
                try {
                    await prisma.lead.updateMany({
                        where: { id: { in: unsyncedIds } },
                        data: { enrollmentStatus: 'ENROLLED' }
                    });
                    leads.forEach(l => {
                        if (unsyncedIds.includes(l.id)) {
                            l.enrollmentStatus = 'ENROLLED';
                        }
                    });
                } catch (syncErr) {
                    console.error("Auto-syncing lead enrollment status error:", syncErr);
                }
            }
        }

        // Demote leads marked enrolled who have no approved payment in this batch
        const unverifiedIds = leads
            .filter(l => !primaryEnrolledLeadIds.has(l.id) && (l.enrollmentStatus === 'ENROLLED' || l.enrollmentStatus === 'PAID'))
            .map(l => l.id);
        if (unverifiedIds.length > 0) {
            try {
                await prisma.lead.updateMany({
                    where: { id: { in: unverifiedIds } },
                    data: { enrollmentStatus: 'NON_ENROLLED' }
                });
                leads.forEach(l => {
                    if (unverifiedIds.includes(l.id)) {
                        l.enrollmentStatus = 'NON_ENROLLED';
                    }
                });
            } catch (demoteErr) {
                console.error("Demoting unverified leads error:", demoteErr);
            }
        }

        const multiBatchGuard = await buildMultiBatchGuard(leads);
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

            let isReallyEnrolled = primaryEnrolledLeadIds.has(l.id);
            // 🔥 Multi-batch chat: the PRIMARY coordinator only gets credit for a payment in the PRIMARY batch
            if (multiBatchGuard.has(l.id)) isReallyEnrolled = multiBatchGuard.primaryPaid(l);
            const isEnrolled = isReallyEnrolled;

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

            const isAssignedToRealStaff = l.assignedTo && l.assignedUser && !['STUDENT', 'Student', 'USER', 'user'].includes(l.assignedUser.role);
            if (isAssignedToRealStaff) {
                // Only coordinators belonging to this business (and not call center agents)
                if (!isStaffInBusiness(l.assignedUser, businessId, targetBizName)) {
                    return;
                }

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
                        staffId: l.assignedUser?.id || l.assignedTo,
                        id: l.assignedUser?.id || l.assignedTo,
                        firstName: l.assignedUser?.firstName || '',
                        lastName: l.assignedUser?.lastName || '',
                        name: staffName,
                        image: l.assignedUser?.image || l.assignedUser?.appChatDp || null,
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
                    const cleanPhone = l.phone ? l.phone.split('_')[0].replace(/[^0-9]/g, '').slice(-7) : '';
                    const mappedType = verifiedPhones.paymentTypeMap ? verifiedPhones.paymentTypeMap[cleanPhone] : null;
                    const determinedType = mappedType || (l.paymentIntention === 'FULL' ? 'FULL' : (l.paymentIntention === 'UPGRADE' ? 'UPGRADE' : (l.paymentIntention === 'INSTALLMENTS' || l.paymentIntention === 'INSTALLMENT' ? 'INSTALLMENT' : (l.paymentIntention === 'MONTHLY' ? 'MONTHLY' : 'MONTHLY'))));
                    if (determinedType === 'FULL') staffMap[staffName].overall.full++;
                    else if (determinedType === 'UPGRADE') staffMap[staffName].overall.upgrade++;
                    else if (determinedType === 'INSTALLMENT') staffMap[staffName].overall.installment++;
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
                    enrolled: isEnrolled ? 'ENROLLED' : 'NON_ENROLLED',
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
            enrollmentStatus: primaryEnrolledLeadIds.has(l.id) ? 'ENROLLED' : 'NON_ENROLLED',
            paymentPlan: l.paymentIntention || 'NOT_DECIDED',
            remark: l.newInqFeedback || 'No Remark'
        }));

        // 🔥 Multi-batch: credit EXTRA-batch enrollments to the extra batch's coordinator
        try {
            const extra = await applyExtraBatchCredits({ businessId, batchId, startDate, endDate, inquiryTypes: ['NEW_INQ'], staffMap });
            totalNewInq += extra.assigned; totalAssigned += extra.assigned; totalEnrolled += extra.enrolled;
        } catch (e) { console.error('Extra batch credits (new inq) failed:', e); }
        res.status(200).json({
            totalNewInq, 
            totalAssigned, 
            totalContacted, 
            totalPending: totalActualPending, 
            totalDirectPaid,
            totalEnrolled, 
            totalDelayed,
            staffBreakdown: Object.values(staffMap),
            rawLeads: rawLeadsForExport,
            batchGoals: await getCampaignBatchGoals(businessId, batchId, 'NEW_INQ')
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
        const targetBizName = await resolveTargetBizName(businessId, batchId);

        // 🔥 FIX: Reverted to purely OPEN_SEMINAR and NORMAL. 
        const whereClause = buildStatsWhereClause(businessId, batchId, startDate, endDate, {
            campaignType: 'AFTER_SEMINAR', inquiryType: { in: ['OPEN_SEMINAR', 'NORMAL'] }
        });

        let leads = await prisma.lead.findMany({
            where: whereClause,
            include: { assignedUser: { select: { id: true, firstName: true, lastName: true, businessType: true, role: true, department: true, image: true, appChatDp: true } } }
        });

        // Bridge Transfers අනිවාර්යයෙන්ම අයින් කරන්න
        leads = leads.filter(l => l.source !== 'bridge_transfer');

        const verifiedPhones = await getVerifiedPhones(businessId, batchId);
        const primaryEnrolledLeadIds = await getPrimaryEnrolledLeadIds(businessId, batchId, verifiedPhones);
        const activeStaffIds = await getActiveStaffIds(businessId, batchId);

        // 🔥 AUTO-SYNC VERIFIED PAID LEADS TO 'ENROLLED' IN DB & DEMOTE UNVERIFIED 🔥
        if (primaryEnrolledLeadIds && primaryEnrolledLeadIds.size > 0) {
            const unsyncedIds = leads
                .filter(l => primaryEnrolledLeadIds.has(l.id) && l.enrollmentStatus !== 'ENROLLED')
                .map(l => l.id);
            if (unsyncedIds.length > 0) {
                try {
                    await prisma.lead.updateMany({
                        where: { id: { in: unsyncedIds } },
                        data: { enrollmentStatus: 'ENROLLED' }
                    });
                    leads.forEach(l => {
                        if (unsyncedIds.includes(l.id)) {
                            l.enrollmentStatus = 'ENROLLED';
                        }
                    });
                } catch (syncErr) {
                    console.error("Auto-syncing lead enrollment status error in open sem:", syncErr);
                }
            }
        }

        // Demote leads marked enrolled who have no approved payment in this batch
        const unverifiedIds = leads
            .filter(l => !primaryEnrolledLeadIds.has(l.id) && (l.enrollmentStatus === 'ENROLLED' || l.enrollmentStatus === 'PAID'))
            .map(l => l.id);
        if (unverifiedIds.length > 0) {
            try {
                await prisma.lead.updateMany({
                    where: { id: { in: unverifiedIds } },
                    data: { enrollmentStatus: 'NON_ENROLLED' }
                });
                leads.forEach(l => {
                    if (unverifiedIds.includes(l.id)) {
                        l.enrollmentStatus = 'NON_ENROLLED';
                    }
                });
            } catch (demoteErr) {
                console.error("Demoting unverified open sem leads error:", demoteErr);
            }
        }

        const multiBatchGuard = await buildMultiBatchGuard(leads);
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

            let isReallyEnrolled = primaryEnrolledLeadIds.has(l.id);
            // 🔥 Multi-batch chat: the PRIMARY coordinator only gets credit for a payment in the PRIMARY batch
            if (multiBatchGuard.has(l.id)) isReallyEnrolled = multiBatchGuard.primaryPaid(l);
            const isEnrolled = isReallyEnrolled;

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

            const isAssignedToRealStaff = l.assignedTo && l.assignedUser && !['STUDENT', 'Student', 'USER', 'user'].includes(l.assignedUser.role);
            if (isAssignedToRealStaff) {
                // Only coordinators belonging to this business (and not call center agents)
                if (!isStaffInBusiness(l.assignedUser, businessId, targetBizName)) {
                    return;
                }

                totalAssigned++;
                if (isEnrolled) totalEnrolled++;
                if (isContacted) totalContacted++;
                if (isActualPending) totalActualPending++;
                if (isDirectPaid) totalDirectPaid++;
                if (isDelayed) totalDelayed++;

                const fName = (l.assignedUser?.firstName || '').trim();
                const lName = (l.assignedUser?.lastName || '').trim();
                const staffName = l.assignedUser ? `${fName} ${lName}`.trim() : `Staff #${l.assignedTo}`;

                // Initialize Staff Object if not exists
                if (!staffMap[staffName]) {
                    staffMap[staffName] = {
                        staffId: l.assignedUser?.id || l.assignedTo,
                        id: l.assignedUser?.id || l.assignedTo,
                        firstName: l.assignedUser?.firstName || '',
                        lastName: l.assignedUser?.lastName || '',
                        name: staffName,
                        image: l.assignedUser?.image || l.assignedUser?.appChatDp || null,
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
                if (isEnrolled) {
                    bucket = 'answered';
                } else if (l.openSemCallStatus === 'reject') {
                    bucket = 'reject';
                } else if (l.openSemCallStatus === 'no_answer') {
                    bucket = 'noAnswer';
                } else if (l.openSemCallStatus === 'answered' || (isContacted && l.openSemCallStatus !== 'no_answer' && l.openSemCallStatus !== 'reject')) {
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
                    const cleanPhone = l.phone ? l.phone.split('_')[0].replace(/[^0-9]/g, '').slice(-7) : '';
                    const mappedType = verifiedPhones.paymentTypeMap ? verifiedPhones.paymentTypeMap[cleanPhone] : null;
                    const determinedType = mappedType || (l.paymentIntention === 'FULL' ? 'FULL' : (l.paymentIntention === 'UPGRADE' ? 'UPGRADE' : (l.paymentIntention === 'INSTALLMENTS' || l.paymentIntention === 'INSTALLMENT' ? 'INSTALLMENT' : (l.paymentIntention === 'MONTHLY' ? 'MONTHLY' : 'MONTHLY'))));
                    if (determinedType === 'FULL') staffMap[staffName].overall.full++;
                    else if (determinedType === 'UPGRADE') staffMap[staffName].overall.upgrade++;
                    else if (determinedType === 'INSTALLMENT') staffMap[staffName].overall.installment++;
                    else staffMap[staffName].overall.monthly++;
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
                    enrolled: isEnrolled ? 'ENROLLED' : 'NON_ENROLLED',
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

        // 🔥 Export Raw Lead Data 🔥
        const rawLeadsForExport = leads.map(l => ({
            id: l.id,
            phone: l.phone ? l.phone.split('_')[0] : '', // Clean Phone
            name: l.name || 'Unknown',
            assignedToName: l.assignedUser ? `${l.assignedUser.firstName} ${l.assignedUser.lastName}` : 'Unassigned',
            round: l.openSemRound || 1,
            phase: l.openSemPhase || 1,
            callStatus: l.openSemCallStatus || 'pending',
            enrollmentStatus: primaryEnrolledLeadIds.has(l.id) ? 'ENROLLED' : 'NON_ENROLLED',
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
            if (primaryEnrolledLeadIds.has(l.id)) return false;
            const startTime = new Date(l.assignedAt || l.createdAt).getTime();
            const diffMs = now.getTime() - startTime;
            const currentRound = l.openSemRound || 1;
            if (currentRound === 1) return diffMs > 7 * 24 * 60 * 60 * 1000;
            if (currentRound === 2) return diffMs > 14 * 24 * 60 * 60 * 1000;
            return false;
        };

        // R1
        campaignRounds.r1.assigned = leads.length;
        const r1Current = leads.filter(l => (l.openSemRound || 1) === 1 && !primaryEnrolledLeadIds.has(l.id));
        campaignRounds.r1.currentlyInRound = r1Current.length;
        campaignRounds.r1.pending = r1Current.filter(l => l.openSemCallStatus === 'pending' || !l.openSemCallStatus).length;
        campaignRounds.r1.noAnswer = r1Current.filter(l => l.openSemCallStatus === 'no_answer').length;
        campaignRounds.r1.reject = r1Current.filter(l => l.openSemCallStatus === 'reject').length;
        campaignRounds.r1.delayed = r1Current.filter(l => isDelayedFn(l) && (l.openSemCallStatus === 'pending' || !l.openSemCallStatus)).length;
        campaignRounds.r1.movedToR2 = leads.filter(l => (l.openSemRound || 1) > 1 && !primaryEnrolledLeadIds.has(l.id)).length;
        
        const r1AnsweredCount = leads.filter(l => (l.openSemRound || 1) > 1 || primaryEnrolledLeadIds.has(l.id) || l.openSemCallStatus === 'answered').length;
        campaignRounds.r1.rate = campaignRounds.r1.assigned > 0 ? ((r1AnsweredCount / campaignRounds.r1.assigned) * 100).toFixed(1) : 0;

        // R2
        const r2Arrived = leads.filter(l => (l.openSemRound || 1) >= 2);
        campaignRounds.r2.assigned = r2Arrived.length;
        const r2Current = r2Arrived.filter(l => (l.openSemRound || 1) === 2 && !primaryEnrolledLeadIds.has(l.id));
        campaignRounds.r2.currentlyInRound = r2Current.length;
        campaignRounds.r2.pending = r2Current.filter(l => l.openSemCallStatus === 'pending' || !l.openSemCallStatus).length;
        campaignRounds.r2.noAnswer = r2Current.filter(l => l.openSemCallStatus === 'no_answer').length;
        campaignRounds.r2.reject = r2Current.filter(l => l.openSemCallStatus === 'reject').length;
        campaignRounds.r2.delayed = r2Current.filter(l => isDelayedFn(l) && (l.openSemCallStatus === 'pending' || !l.openSemCallStatus)).length;
        campaignRounds.r2.movedToNonEnrolled = r2Arrived.filter(l => (l.openSemRound || 1) >= 3 && !primaryEnrolledLeadIds.has(l.id)).length;
        campaignRounds.r2.movedToPaid = r2Arrived.filter(l => primaryEnrolledLeadIds.has(l.id)).length;
        
        const r2AnsweredCount = r2Arrived.filter(l => (l.openSemRound || 1) > 2 || primaryEnrolledLeadIds.has(l.id) || l.openSemCallStatus === 'answered').length;
        campaignRounds.r2.rate = campaignRounds.r2.assigned > 0 ? ((r2AnsweredCount / campaignRounds.r2.assigned) * 100).toFixed(1) : 0;

        // Non Enrolled
        const neLeads = leads.filter(l => (l.openSemRound || 1) >= 3 && !primaryEnrolledLeadIds.has(l.id));
        campaignRounds.nonEnrolled.assigned = neLeads.length;
        campaignRounds.nonEnrolled.currentlyInRound = neLeads.length;
        campaignRounds.nonEnrolled.pending = neLeads.filter(l => l.openSemCallStatus === 'pending' || !l.openSemCallStatus).length;
        campaignRounds.nonEnrolled.reject = neLeads.filter(l => l.openSemCallStatus === 'reject').length;
        campaignRounds.nonEnrolled.delayed = neLeads.filter(l => isDelayedFn(l) && (l.openSemCallStatus === 'pending' || !l.openSemCallStatus)).length;

        let batchGoals = { targetIndividualGoal: 40, targetGroupGoal: 50 };
        try {
            if (batchId && batchId !== 'ALL' && batchId !== 'undefined' && batchId !== 'null') {
                const targetBatch = await prisma.batch.findUnique({
                    where: { id: parseInt(batchId) },
                    select: { targetIndividualGoal: true, targetGroupGoal: true }
                });
                if (targetBatch) {
                    batchGoals = {
                        targetIndividualGoal: targetBatch.targetIndividualGoal ?? 40,
                        targetGroupGoal: targetBatch.targetGroupGoal ?? 50
                    };
                }
            } else if (businessId && businessId !== 'ALL' && businessId !== 'undefined' && businessId !== 'null') {
                const firstBatch = await prisma.batch.findFirst({
                    where: { businessId: parseInt(businessId) },
                    select: { targetIndividualGoal: true, targetGroupGoal: true }
                });
                if (firstBatch) {
                    batchGoals = {
                        targetIndividualGoal: firstBatch.targetIndividualGoal ?? 40,
                        targetGroupGoal: firstBatch.targetGroupGoal ?? 50
                    };
                }
            }
        } catch (e) {
            console.error("Batch goals fetch error in open sem stats:", e);
        }

        // 🔥 Multi-batch: credit EXTRA-batch enrollments to the extra batch's coordinator
        try {
            const extra = await applyExtraBatchCredits({ businessId, batchId, startDate, endDate, inquiryTypes: ['OPEN_SEMINAR', 'NORMAL'], staffMap });
            totalOpenSem += extra.assigned; totalAssigned += extra.assigned; totalEnrolled += extra.enrolled;
        } catch (e) { console.error('Extra batch credits (open sem) failed:', e); }
        res.status(200).json({
            totalOpenSem, totalAssigned, totalContacted, totalPending: totalActualPending, totalDirectPaid, totalEnrolled, totalDelayed,
            campaignRounds,
            staffBreakdown: Object.values(staffMap),
            rawLeads: rawLeadsForExport,
            batchGoals
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
            const isEnrolled = isReallyEnrolled;

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
// ==========================================
// 🔥 CAMPAIGN SUMMARY TILES (Manager System Overview) 🔥
// Open Seminar + New Inquiries summary for the realtime overview tiles.
// Re-uses the exact getOpenSeminarStats / getNewInquiryStats logic (same numbers as the
// campaign dashboards), strips the heavy lead lists, and caches the result for 60 seconds
// so the overview can poll every minute without loading the database.
// ==========================================
const CAMPAIGN_SUMMARY_TTL_MS = 60 * 1000;
const campaignSummaryCache = new Map();

const runStatsHandler = async (handler, req) => {
    let data = {};
    let code = 200;
    const fakeRes = {
        status: (c) => { code = c; return fakeRes; },
        json: (d) => { data = d; return fakeRes; }
    };
    await handler(req, fakeRes);
    return code >= 400 ? null : data;
};

const summarizeCampaign = (data, total) => {
    if (!data) return null;
    let answered = 0, noAnswer = 0, reject = 0;
    (data.staffBreakdown || []).forEach(s => {
        answered += (s.overall?.answered || 0);
        noAnswer += (s.overall?.noAnswer || 0);
        reject += (s.overall?.reject || 0);
    });
    const assigned = data.totalAssigned || 0;
    const enrolled = data.totalEnrolled || 0;
    const contacted = data.totalContacted || 0;

    // Top contributor: same ranking as the campaign leaderboard (conversion rate, then enrolled count)
    const ranked = (data.staffBreakdown || [])
        .filter(s => (s.overall?.assigned || 0) > 0)
        .sort((a, b) => {
            const rA = a.overall.enrolled / a.overall.assigned;
            const rB = b.overall.enrolled / b.overall.assigned;
            if (rB !== rA) return rB - rA;
            return (b.overall.enrolled || 0) - (a.overall.enrolled || 0);
        });
    const rankedLite = ranked.map((st, i) => ({
        rank: i + 1,
        staffId: st.staffId || st.id || null,
        name: st.name,
        image: st.image || null,
        assigned: st.overall.assigned || 0,
        enrolled: st.overall.enrolled || 0,
        rate: Math.round(((st.overall.enrolled || 0) / st.overall.assigned) * 1000) / 10,
        contacted: st.overall.contacted || 0,
        pending: st.overall.pending || 0,
        answered: st.overall.answered || 0,
        noAnswer: st.overall.noAnswer || 0,
        reject: st.overall.reject || 0,
        delayed: st.overall.delayed || 0,
        directPaid: st.overall.directPaid || 0
    }));
    const top = ranked[0];
    const topContributor = top ? {
        name: top.name,
        image: top.image || null,
        enrolled: top.overall.enrolled || 0,
        assigned: top.overall.assigned || 0,
        rate: Math.round((top.overall.enrolled / top.overall.assigned) * 1000) / 10
    } : null;
    const goals = data.batchGoals || { targetIndividualGoal: 40, targetGroupGoal: 50 };
    const conversionRate = assigned > 0 ? Math.round((enrolled / assigned) * 1000) / 10 : 0;
    const groupTargetCount = Math.floor((goals.targetGroupGoal / 100) * assigned);

    return {
        target: {
            individual: goals.targetIndividualGoal,
            group: goals.targetGroupGoal,
            groupTargetCount,
            neededForGroup: Math.max(groupTargetCount - enrolled, 0),
            achieved: assigned > 0 && enrolled >= groupTargetCount
        },
        topContributor,
        leaderboard: rankedLite.slice(0, 5),
        _ranked: rankedLite, // full list, only used to build the coordinator's own view (stripped from responses)
        total: total || 0,
        assigned,
        unassigned: Math.max((total || 0) - assigned, 0),
        contacted,
        pending: data.totalPending || 0,
        answered,
        noAnswer,
        reject,
        enrolled,
        directPaid: data.totalDirectPaid || 0,
        delayed: data.totalDelayed || 0,
        conversionRate,
        contactedRate: assigned > 0 ? Math.round((contacted / assigned) * 1000) / 10 : 0
    };
};

// 🔥 Coordinator view: ?mine=1 adds `me` (the LOGGED-IN user's own numbers, rank and goals).
// The staff id ALWAYS comes from the auth token, never from the URL.
const buildMeView = (camp, userId) => {
    if (!camp) return null;
    const ranked = camp._ranked || [];
    const idx = ranked.findIndex(r => String(r.staffId) === String(userId));
    const indGoal = camp.target?.individual ?? 40;
    if (idx < 0) {
        return { rank: null, totalRanked: ranked.length, assigned: 0, enrolled: 0, rate: 0, pending: 0, answered: 0, noAnswer: 0, reject: 0, delayed: 0, directPaid: 0, contacted: 0, contactedRate: 0,
            single: { goal: indGoal, targetCount: 0, needed: 0, achieved: false }, toNextRank: null };
    }
    const meRow = ranked[idx];
    const targetCount = Math.floor((indGoal / 100) * meRow.assigned);
    let toNextRank = null;
    if (idx > 0) {
        const above = ranked[idx - 1];
        // enrolments needed so that my rate goes ABOVE the person ranked just above me
        const need = Math.floor((above.rate / 100) * meRow.assigned) + 1 - meRow.enrolled;
        toNextRank = { rank: above.rank, name: above.name, needed: Math.max(1, need) };
    }
    return {
        ...meRow,
        totalRanked: ranked.length,
        contactedRate: meRow.assigned > 0 ? Math.round((meRow.contacted / meRow.assigned) * 1000) / 10 : 0,
        single: { goal: indGoal, targetCount, needed: Math.max(targetCount - meRow.enrolled, 0), achieved: meRow.assigned > 0 && meRow.enrolled >= targetCount },
        toNextRank
    };
};

const buildSummaryResponse = (payload, req, cached) => {
    const mine = String(req.query.mine) === '1';
    const userId = req.user ? (req.user.id || req.user.userId) : null;
    const strip = (camp) => {
        if (!camp) return camp;
        const { _ranked, ...rest } = camp;
        if (mine) rest.me = buildMeView(camp, userId);
        return rest;
    };
    return {
        ...payload,
        openSeminar: strip(payload.openSeminar),
        newInquiries: strip(payload.newInquiries),
        cached
    };
};

exports.getCampaignSummary = async (req, res) => {
    try {
        const { businessId, batchId } = req.query;
        const cacheKey = `${businessId || 'ALL'}|${batchId || 'ALL'}`;
        const forceRefresh = req.query.refresh === '1';
        const cached = campaignSummaryCache.get(cacheKey);
        if (!forceRefresh && cached && Date.now() - cached.at < CAMPAIGN_SUMMARY_TTL_MS) {
            return res.status(200).json(buildSummaryResponse(cached.data, req, true));
        }

        // Date filters are not used for the live tiles
        const statsReq = { ...req, query: { businessId, batchId } };
        const [openSemData, newInqData] = await Promise.all([
            runStatsHandler(exports.getOpenSeminarStats, statsReq),
            runStatsHandler(exports.getNewInquiryStats, statsReq)
        ]);

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const openSemTodayWhere = buildStatsWhereClause(businessId, batchId, null, null, {
            campaignType: 'AFTER_SEMINAR', inquiryType: { in: ['OPEN_SEMINAR', 'NORMAL'] },
            createdAt: { gte: startOfToday }, NOT: { source: 'bridge_transfer' }
        });
        const newInqTodayWhere = buildStatsWhereClause(businessId, batchId, null, null, {
            campaignType: 'AFTER_SEMINAR', inquiryType: 'NEW_INQ', createdAt: { gte: startOfToday }
        });
        const [openSemToday, newInqToday] = await Promise.all([
            prisma.lead.count({ where: openSemTodayWhere }).catch(() => 0),
            prisma.lead.count({ where: newInqTodayWhere }).catch(() => 0)
        ]);

        const openSeminar = summarizeCampaign(openSemData, openSemData?.totalOpenSem);
        const newInquiries = summarizeCampaign(newInqData, newInqData?.totalNewInq);
        if (openSeminar) {
            openSeminar.todayNew = openSemToday;
            const r1 = openSemData?.campaignRounds?.r1 || {};
            openSeminar.movedToR2 = r1.movedToR2 || r1.moved || 0;
        }
        if (newInquiries) newInquiries.todayNew = newInqToday;

        const payload = { openSeminar, newInquiries, generatedAt: new Date().toISOString() };
        campaignSummaryCache.set(cacheKey, { at: Date.now(), data: payload });
        res.status(200).json(buildSummaryResponse(payload, req, false));
    } catch (error) {
        console.error("Campaign Summary Error:", error);
        res.status(500).json({ error: "Failed to fetch campaign summary" });
    }
};

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

        // 🏦 1. Fetch all verified payments (status: 1 only, genuinely approved)
        const paymentWhere = { status: 1, amount: { gt: 0 } };
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
        const { businessId, batchId, startDate, endDate, coordinatorId } = req.query;

        // Build base where clause for business & batch filtering (all assigned leads)
        const baseWhere = buildStatsWhereClause(businessId, batchId, null, null);

        // Bridge Transfers should be excluded from performance tracking to maintain accuracy
        baseWhere.NOT = {
            source: 'bridge_transfer',
            lastMessage: null
        };

        // Fetch both FREE_SEMINAR and AFTER_SEMINAR leads
        const leads = await prisma.lead.findMany({
            where: baseWhere,
            include: { 
                assignedUser: { select: { id: true, firstName: true, lastName: true, businessType: true, role: true } }
            }
        });

        const verifiedPhones = await getVerifiedPhones(businessId, batchId);
        const primaryEnrolledLeadIds = await getPrimaryEnrolledLeadIds(businessId, batchId, verifiedPhones);

        // Get chat message counts per lead (Inbound vs Outbound)
        const leadIds = leads.map(l => l.id);
        
        let messageCountsMap = {};
        if (leadIds.length > 0) {
            const chatStats = await prisma.chatMessage.groupBy({
                by: ['leadId', 'direction'],
                where: { leadId: { in: leadIds } },
                _count: { id: true }
            });

            chatStats.forEach(c => {
                if (!messageCountsMap[c.leadId]) {
                    messageCountsMap[c.leadId] = { inbound: 0, outbound: 0 };
                }
                if (c.direction === 'inbound') {
                    messageCountsMap[c.leadId].inbound += c._count.id;
                } else {
                    messageCountsMap[c.leadId].outbound += c._count.id;
                }
            });
        }

        // Fetch Call Campaign Audit Logs for Date-Wise Coverage Calendar (Last 30 days or range)
        let calendarLogsWhere = {
            actionType: { in: ['STATUS_UPDATED', 'CALL_ATTEMPTED', 'COVERED'] }
        };
        if (leadIds.length > 0) {
            calendarLogsWhere.leadId = { in: leadIds };
        }
        if (startDate && endDate) {
            calendarLogsWhere.createdAt = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        } else {
            // Default last 30 days
            const past30 = new Date();
            past30.setDate(past30.getDate() - 30);
            calendarLogsWhere.createdAt = { gte: past30 };
        }

        const auditLogs = await prisma.callCampaignAuditLog.findMany({
            where: calendarLogsWhere,
            select: {
                leadId: true,
                actionedById: true,
                campaignCategory: true,
                createdAt: true,
                newStatus: true
            }
        });

        let coordinatorMap = {};

        const createEmptyCoordStats = (staffId, staffName) => ({
            id: staffId,
            name: staffName,
            totalAssigned: 0,
            freeSem: {
                assignedCount: 0,
                messagesReceived: 0,
                messagesSent: 0,
                coveredCount: 0,
                attemptedCount: 0,
                answeredCount: 0,
                callAnswerRate: 0,
                phase1: { answer: 0, noAnswer: 0, pending: 0, reject: 0, total: 0 },
                phase2: { answer: 0, noAnswer: 0, pending: 0, reject: 0, total: 0 }
            },
            afterSem: {
                assignedCount: 0,
                messagesReceived: 0,
                messagesSent: 0,
                openSem: {
                    assignedCount: 0,
                    round1: { active: 0, pending: 0, noAnswer: 0, reject: 0 },
                    round2: { active: 0, pending: 0, noAnswer: 0, reject: 0 },
                    paidCount: 0,
                    nonEnrolledCount: 0,
                    paidPercentage: 0,
                    nonEnrolledPercentage: 0
                },
                newInq: {
                    assignedCount: 0,
                    round1: { active: 0, pending: 0, noAnswer: 0, reject: 0 },
                    round2: { active: 0, pending: 0, noAnswer: 0, reject: 0 },
                    paidCount: 0,
                    nonEnrolledCount: 0,
                    paidPercentage: 0,
                    nonEnrolledPercentage: 0
                },
                combinedTotals: {
                    totalLeads: 0,
                    totalPaid: 0,
                    totalNonEnrolled: 0
                }
            },
            calendarDailyCoverage: {}
        });

        // If a business filter is specified, fetch staff registered under that business to initialize Map
        if (businessId && businessId !== 'ALL' && businessId !== 'null' && businessId !== 'undefined') {
            const bizIdStr = String(businessId);
            const bizStaff = await prisma.user.findMany({
                where: {
                    role: { notIn: ['Student', 'USER', 'STUDENT', 'user', 'student'] },
                    businessType: { contains: bizIdStr }
                },
                select: { id: true, firstName: true, lastName: true }
            });

            bizStaff.forEach(s => {
                const staffName = `${s.firstName} ${s.lastName}`.trim();
                coordinatorMap[s.id] = createEmptyCoordStats(s.id, staffName);
            });
        }

        // Helper to normalize call status into: 'answer', 'no_answer', 'pending', 'reject'
        const normalizeStatus = (status) => {
            if (!status || status === 'pending') return 'pending';
            const s = String(status).toLowerCase();
            if (s.includes('answer') && !s.includes('no')) return 'answer';
            if (s.includes('no_ans') || s.includes('no answer') || s.includes('unanswered') || s.includes('r1_unanswered') || s.includes('r2_unanswered')) return 'no_answer';
            if (s.includes('reject') || s.includes('not_interested') || s.includes('drop')) return 'reject';
            if (s.includes('enrolled') || s.includes('paid') || s.includes('completed') || s.includes('covered')) return 'answer';
            return 'pending';
        };

        leads.forEach(l => {
            if (l.assignedTo) {
                const staffId = l.assignedTo;
                const staffName = l.assignedUser ? `${l.assignedUser.firstName} ${l.assignedUser.lastName}`.trim() : `Staff #${staffId}`;

                if (!coordinatorMap[staffId]) {
                    coordinatorMap[staffId] = {
                        id: staffId,
                        name: staffName,
                        totalAssigned: 0,
                        
                        // 01 & 03: Free Sem CRM Stats
                        freeSem: {
                            assignedCount: 0,
                            messagesReceived: 0,
                            messagesSent: 0,
                            coveredCount: 0,
                            attemptedCount: 0,
                            answeredCount: 0,
                            callAnswerRate: 0,
                            phase1: { answer: 0, noAnswer: 0, pending: 0, reject: 0, total: 0 },
                            phase2: { answer: 0, noAnswer: 0, pending: 0, reject: 0, total: 0 }
                        },

                        // 02 & 04 & 06: After Sem CRM Stats
                        afterSem: {
                            assignedCount: 0,
                            messagesReceived: 0,
                            messagesSent: 0,
                            openSem: {
                                assignedCount: 0,
                                round1: { active: 0, pending: 0, noAnswer: 0, reject: 0 },
                                round2: { active: 0, pending: 0, noAnswer: 0, reject: 0 },
                                paidCount: 0,
                                nonEnrolledCount: 0,
                                paidPercentage: 0,
                                nonEnrolledPercentage: 0
                            },
                            newInq: {
                                assignedCount: 0,
                                round1: { active: 0, pending: 0, noAnswer: 0, reject: 0 },
                                round2: { active: 0, pending: 0, noAnswer: 0, reject: 0 },
                                paidCount: 0,
                                nonEnrolledCount: 0,
                                paidPercentage: 0,
                                nonEnrolledPercentage: 0
                            },
                            combinedTotals: {
                                totalLeads: 0,
                                totalPaid: 0,
                                totalNonEnrolled: 0
                            }
                        },

                        // 07: Call Summary Calendar (dateString -> { freeSemCovered, afterSemCovered, totalCovered })
                        calendarDailyCoverage: {}
                    };
                }

                const coord = coordinatorMap[staffId];
                coord.totalAssigned++;

                const msgStats = messageCountsMap[l.id] || { inbound: 0, outbound: 0 };
                const isPaid = primaryEnrolledLeadIds.has(l.id);

                if (l.campaignType === 'FREE_SEMINAR') {
                    // --- FREE SEMINAR ---
                    coord.freeSem.assignedCount++;
                    coord.freeSem.messagesReceived += msgStats.inbound;
                    coord.freeSem.messagesSent += msgStats.outbound;

                    const callStat = normalizeStatus(l.callStatus);
                    const phase = l.phase || 1;
                    const phaseObj = phase === 2 ? coord.freeSem.phase2 : coord.freeSem.phase1;
                    phaseObj.total++;

                    if (callStat === 'answer') {
                        phaseObj.answer++;
                        coord.freeSem.coveredCount++;
                        coord.freeSem.answeredCount++;
                        coord.freeSem.attemptedCount++;
                    } else if (callStat === 'no_answer') {
                        phaseObj.noAnswer++;
                        coord.freeSem.attemptedCount++;
                    } else if (callStat === 'reject') {
                        phaseObj.reject++;
                        coord.freeSem.coveredCount++;
                        coord.freeSem.attemptedCount++;
                    } else {
                        phaseObj.pending++;
                    }

                } else {
                    // --- AFTER SEMINAR ---
                    coord.afterSem.assignedCount++;
                    coord.afterSem.messagesReceived += msgStats.inbound;
                    coord.afterSem.messagesSent += msgStats.outbound;

                    const isNewInq = l.inquiryType === 'NEW_INQ';
                    const targetSection = isNewInq ? coord.afterSem.newInq : coord.afterSem.openSem;

                    targetSection.assignedCount++;
                    coord.afterSem.combinedTotals.totalLeads++;

                    if (isPaid) {
                        targetSection.paidCount++;
                        coord.afterSem.combinedTotals.totalPaid++;
                    } else {
                        targetSection.nonEnrolledCount++;
                        coord.afterSem.combinedTotals.totalNonEnrolled++;
                    }

                    // Round breakdown
                    const roundNum = isNewInq ? (l.newInqRound || l.coordinationRound || 1) : (l.openSemRound || l.coordinationRound || 1);
                    const rawStatus = isNewInq ? (l.newInqCallStatus || l.callStatus) : (l.openSemCallStatus || l.callStatus);
                    const normalized = normalizeStatus(rawStatus);

                    const roundObj = roundNum === 2 ? targetSection.round2 : targetSection.round1;

                    if (normalized === 'pending') {
                        roundObj.pending++;
                    } else if (normalized === 'no_answer') {
                        roundObj.noAnswer++;
                        roundObj.active++;
                    } else if (normalized === 'reject') {
                        roundObj.reject++;
                    } else {
                        // Answer / Active Covered
                        roundObj.active++;
                    }
                }
            }
        });

        // Compute percentages and call answer rates
        Object.values(coordinatorMap).forEach(coord => {
            // Free sem call answer rate
            if (coord.freeSem.attemptedCount > 0) {
                coord.freeSem.callAnswerRate = Math.round((coord.freeSem.answeredCount / coord.freeSem.attemptedCount) * 100);
            }

            // Open Sem %
            if (coord.afterSem.openSem.assignedCount > 0) {
                coord.afterSem.openSem.paidPercentage = Math.round((coord.afterSem.openSem.paidCount / coord.afterSem.openSem.assignedCount) * 100);
                coord.afterSem.openSem.nonEnrolledPercentage = Math.round((coord.afterSem.openSem.nonEnrolledCount / coord.afterSem.openSem.assignedCount) * 100);
            }

            // New Inq %
            if (coord.afterSem.newInq.assignedCount > 0) {
                coord.afterSem.newInq.paidPercentage = Math.round((coord.afterSem.newInq.paidCount / coord.afterSem.newInq.assignedCount) * 100);
                coord.afterSem.newInq.nonEnrolledPercentage = Math.round((coord.afterSem.newInq.nonEnrolledCount / coord.afterSem.newInq.assignedCount) * 100);
            }
        });

        // Process Audit Logs into Calendar Daily Coverage for each coordinator
        auditLogs.forEach(log => {
            if (log.actionedById && coordinatorMap[log.actionedById]) {
                const dateKey = log.createdAt.toISOString().split('T')[0];
                const coord = coordinatorMap[log.actionedById];

                if (!coord.calendarDailyCoverage[dateKey]) {
                    coord.calendarDailyCoverage[dateKey] = { freeSemCovered: 0, afterSemCovered: 0, totalCovered: 0 };
                }

                if (log.campaignCategory === 'FREE_SEMINAR') {
                    coord.calendarDailyCoverage[dateKey].freeSemCovered++;
                } else {
                    coord.calendarDailyCoverage[dateKey].afterSemCovered++;
                }
                coord.calendarDailyCoverage[dateKey].totalCovered++;
            }
        });

        // Fallback calendar entries from lead updated dates if audit logs are empty
        leads.forEach(l => {
            if (l.assignedTo && coordinatorMap[l.assignedTo] && (l.callStatus !== 'pending' && l.callStatus)) {
                const dateKey = (l.lastAttemptAt || l.updatedAt).toISOString().split('T')[0];
                const coord = coordinatorMap[l.assignedTo];
                if (!coord.calendarDailyCoverage[dateKey]) {
                    coord.calendarDailyCoverage[dateKey] = { freeSemCovered: 0, afterSemCovered: 0, totalCovered: 0 };
                }
                if (coord.calendarDailyCoverage[dateKey].totalCovered === 0) {
                    if (l.campaignType === 'FREE_SEMINAR') {
                        coord.calendarDailyCoverage[dateKey].freeSemCovered++;
                    } else {
                        coord.calendarDailyCoverage[dateKey].afterSemCovered++;
                    }
                    coord.calendarDailyCoverage[dateKey].totalCovered++;
                }
            }
        });

        // Build date-wise breakdown list
        let datesList = [];
        if (startDate && endDate) {
            let cur = new Date(startDate);
            const endD = new Date(endDate);
            while (cur <= endD) {
                datesList.push(cur.toISOString().split('T')[0]);
                cur.setDate(cur.getDate() + 1);
            }
        } else {
            for (let i = 13; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                datesList.push(d.toISOString().split('T')[0]);
            }
        }

        const coordIds = Object.keys(coordinatorMap).map(id => parseInt(id)).filter(id => !isNaN(id));

        if (coordIds.length > 0 && datesList.length > 0) {
            const rangeStart = new Date(datesList[0] + 'T00:00:00.000Z');
            const rangeEnd = new Date(datesList[datesList.length - 1] + 'T23:59:59.999Z');

            const rangeMessages = await prisma.chatMessage.findMany({
                where: {
                    senderId: { in: coordIds },
                    direction: { in: ['outbound', 'out', 'OUT'] },
                    createdAt: { gte: rangeStart, lte: rangeEnd }
                },
                select: { senderId: true, leadId: true, createdAt: true, lead: { select: { campaignType: true, phone: true } } }
            });

            const rangeCalls = await prisma.callCampaignAuditLog.findMany({
                where: {
                    actionedById: { in: coordIds },
                    createdAt: { gte: rangeStart, lte: rangeEnd }
                },
                select: { actionedById: true, leadId: true, campaignCategory: true, createdAt: true }
            });

            Object.values(coordinatorMap).forEach(coord => {
                const cId = coord.id;
                const dailyMap = {};
                datesList.forEach(d => {
                    dailyMap[d] = {
                        date: d,
                        freeMsgUnique: new Set(),
                        freeMsgTotal: 0,
                        allMsgUnique: new Set(),
                        allMsgTotal: 0,
                        freeCallsUnique: new Set(),
                        freeCallsTotal: 0,
                        allCallsUnique: new Set(),
                        allCallsTotal: 0
                    };
                });

                const cMsgs = rangeMessages.filter(m => m.senderId === cId);
                cMsgs.forEach(m => {
                    const dKey = m.createdAt.toISOString().split('T')[0];
                    if (dailyMap[dKey]) {
                        dailyMap[dKey].allMsgTotal++;
                        if (m.leadId) dailyMap[dKey].allMsgUnique.add(m.leadId);
                        const isFree = m.lead?.campaignType === 'FREE_SEMINAR' || (m.lead?.phone && !m.lead.phone.includes('_AS'));
                        if (isFree) {
                            dailyMap[dKey].freeMsgTotal++;
                            if (m.leadId) dailyMap[dKey].freeMsgUnique.add(m.leadId);
                        }
                    }
                });

                const cCalls = rangeCalls.filter(c => c.actionedById === cId);
                cCalls.forEach(c => {
                    const dKey = c.createdAt.toISOString().split('T')[0];
                    if (dailyMap[dKey]) {
                        dailyMap[dKey].allCallsTotal++;
                        if (c.leadId) dailyMap[dKey].allCallsUnique.add(c.leadId);
                        const isFree = c.campaignCategory === 'FREE_SEMINAR';
                        if (isFree) {
                            dailyMap[dKey].freeCallsTotal++;
                            if (c.leadId) dailyMap[dKey].freeCallsUnique.add(c.leadId);
                        }
                    }
                });

                const overallFreeMsgUnq = new Set();
                const overallAllMsgUnq = new Set();
                const overallFreeCallsUnq = new Set();
                const overallAllCallsUnq = new Set();

                cMsgs.forEach(m => {
                    if (m.leadId) {
                        overallAllMsgUnq.add(m.leadId);
                        if (m.lead?.campaignType === 'FREE_SEMINAR' || (m.lead?.phone && !m.lead.phone.includes('_AS'))) {
                            overallFreeMsgUnq.add(m.leadId);
                        }
                    }
                });

                cCalls.forEach(c => {
                    if (c.leadId) {
                        overallAllCallsUnq.add(c.leadId);
                        if (c.campaignCategory === 'FREE_SEMINAR') {
                            overallFreeCallsUnq.add(c.leadId);
                        }
                    }
                });

                coord.dateWiseBreakdown = datesList.map(d => ({
                    date: d,
                    freeMsgUnique: dailyMap[d].freeMsgUnique.size,
                    freeMsgTotal: dailyMap[d].freeMsgTotal,
                    allMsgUnique: dailyMap[d].allMsgUnique.size,
                    allMsgTotal: dailyMap[d].allMsgTotal,
                    freeCallsUnique: dailyMap[d].freeCallsUnique.size,
                    freeCallsTotal: dailyMap[d].freeCallsTotal,
                    allCallsUnique: dailyMap[d].allCallsUnique.size,
                    allCallsTotal: dailyMap[d].allCallsTotal
                }));

                coord.dateWiseTotals = {
                    freeMsgUniqueNet: overallFreeMsgUnq.size,
                    freeMsgTotal: cMsgs.filter(m => m.lead?.campaignType === 'FREE_SEMINAR' || (m.lead?.phone && !m.lead.phone.includes('_AS'))).length,
                    allMsgUniqueNet: overallAllMsgUnq.size,
                    allMsgTotal: cMsgs.length,
                    freeCallsUniqueNet: overallFreeCallsUnq.size,
                    freeCallsTotal: cCalls.filter(c => c.campaignCategory === 'FREE_SEMINAR').length,
                    allCallsUniqueNet: overallAllCallsUnq.size,
                    allCallsTotal: cCalls.length
                };
            });
        }

        // Raw leads for export
        const rawLeadsForExport = leads.map(l => ({
            id: l.id,
            coordinatorName: l.assignedUser ? `${l.assignedUser.firstName} ${l.assignedUser.lastName}` : 'Unassigned',
            phone: l.phone ? l.phone.split('_')[0] : '',
            name: l.name || 'Unknown',
            campaignType: l.campaignType || 'FREE_SEMINAR',
            inquiryType: l.inquiryType || 'OPEN_SEMINAR',
            round: l.coordinationRound || 1,
            phase: l.phase || 1,
            callStatus: l.callStatus || 'pending',
            enrollmentStatus: l.enrollmentStatus || 'NON_ENROLLED',
            paymentPlan: l.paymentIntention || 'NOT_DECIDED',
            remark: l.feedback || 'No Remark'
        }));

        // Filter active coordinators (exclude staff with 0 assigned leads and 0 messages/calls in selected business/batch)
        let activeCoordinatorsList = Object.values(coordinatorMap).filter(coord => {
            if (coordinatorId && coordinatorId !== 'ALL' && coordinatorId !== 'null') {
                return String(coord.id) === String(coordinatorId);
            }
            return coord.totalAssigned > 0 || 
                   (coord.dateWiseTotals && (coord.dateWiseTotals.allMsgTotal > 0 || coord.dateWiseTotals.allCallsTotal > 0));
        });

        res.status(200).json({
            coordinators: activeCoordinatorsList,
            rawLeads: rawLeadsForExport
        });

    } catch (error) {
        console.error("Coordinator Progress Stats Error:", error);
        res.status(500).json({ error: "Failed to fetch coordinator progress stats" });
    }
};

// ==========================================
// EXPORT COORDINATOR WORD DOC (.DOCX) CONTROLLER
// ==========================================
exports.exportCoordinatorWordDoc = async (req, res) => {
    try {
        const { businessId, batchId, startDate, endDate, coordinatorId } = req.query;

        // Build base where clause
        const baseWhere = buildStatsWhereClause(businessId, batchId, null, null);
        baseWhere.NOT = { source: 'bridge_transfer', lastMessage: null };

        const leads = await prisma.lead.findMany({
            where: baseWhere,
            include: { assignedUser: { select: { id: true, firstName: true, lastName: true, businessType: true, role: true } } }
        });

        const leadIds = leads.map(l => l.id);
        let messageCountsMap = {};
        if (leadIds.length > 0) {
            const chatStats = await prisma.chatMessage.groupBy({
                by: ['leadId', 'direction'],
                where: { leadId: { in: leadIds } },
                _count: { id: true }
            });
            chatStats.forEach(c => {
                if (!messageCountsMap[c.leadId]) messageCountsMap[c.leadId] = { inbound: 0, outbound: 0 };
                if (c.direction === 'inbound') messageCountsMap[c.leadId].inbound += c._count.id;
                else messageCountsMap[c.leadId].outbound += c._count.id;
            });
        }

        let coordinatorMap = {};
        const createEmptyCoordStats = (staffId, staffName) => ({
            id: staffId, name: staffName, totalAssigned: 0,
            freeSem: { assignedCount: 0, messagesReceived: 0, messagesSent: 0, coveredCount: 0, attemptedCount: 0, answeredCount: 0, callAnswerRate: 0, phase1: { answer: 0, noAnswer: 0, pending: 0, reject: 0, total: 0 }, phase2: { answer: 0, noAnswer: 0, pending: 0, reject: 0, total: 0 } },
            afterSem: { assignedCount: 0, messagesReceived: 0, messagesSent: 0, openSem: { assignedCount: 0, round1: { active: 0, pending: 0, noAnswer: 0, reject: 0 }, round2: { active: 0, pending: 0, noAnswer: 0, reject: 0 }, paidCount: 0, nonEnrolledCount: 0, paidPercentage: 0, nonEnrolledPercentage: 0 }, newInq: { assignedCount: 0, round1: { active: 0, pending: 0, noAnswer: 0, reject: 0 }, round2: { active: 0, pending: 0, noAnswer: 0, reject: 0 }, paidCount: 0, nonEnrolledCount: 0, paidPercentage: 0, nonEnrolledPercentage: 0 }, combinedTotals: { totalLeads: 0, totalPaid: 0, totalNonEnrolled: 0 } },
            calendarDailyCoverage: {}
        });

        if (businessId && businessId !== 'ALL' && businessId !== 'null' && businessId !== 'undefined') {
            const bizIdStr = String(businessId);
            const bizStaff = await prisma.user.findMany({
                where: { role: { notIn: ['Student', 'USER', 'STUDENT'] }, businessType: { contains: bizIdStr } },
                select: { id: true, firstName: true, lastName: true }
            });
            bizStaff.forEach(s => {
                coordinatorMap[s.id] = createEmptyCoordStats(s.id, `${s.firstName} ${s.lastName}`.trim());
            });
        }

        const normalizeStatus = (status) => {
            if (!status || status === 'pending') return 'pending';
            const s = String(status).toLowerCase();
            if (s.includes('answer') && !s.includes('no')) return 'answer';
            if (s.includes('no_ans') || s.includes('no answer') || s.includes('unanswered')) return 'no_answer';
            if (s.includes('reject') || s.includes('not_interested') || s.includes('drop')) return 'reject';
            if (s.includes('enrolled') || s.includes('paid') || s.includes('completed') || s.includes('covered')) return 'answer';
            return 'pending';
        };

        leads.forEach(l => {
            if (l.assignedTo) {
                const staffId = l.assignedTo;
                const staffName = l.assignedUser ? `${l.assignedUser.firstName} ${l.assignedUser.lastName}`.trim() : `Staff #${staffId}`;
                if (!coordinatorMap[staffId]) coordinatorMap[staffId] = createEmptyCoordStats(staffId, staffName);

                const coord = coordinatorMap[staffId];
                coord.totalAssigned++;
                const msgStats = messageCountsMap[l.id] || { inbound: 0, outbound: 0 };
                const isPaid = l.enrollmentStatus === 'ENROLLED' || l.enrollmentStatus === 'PAID' || l.status === 'ENROLLED';

                if (l.campaignType === 'FREE_SEMINAR') {
                    coord.freeSem.assignedCount++;
                    coord.freeSem.messagesReceived += msgStats.inbound;
                    coord.freeSem.messagesSent += msgStats.outbound;
                    const callStat = normalizeStatus(l.callStatus);
                    const phase = l.phase || 1;
                    const phaseObj = phase === 2 ? coord.freeSem.phase2 : coord.freeSem.phase1;
                    phaseObj.total++;
                    if (callStat === 'answer') { phaseObj.answer++; coord.freeSem.coveredCount++; coord.freeSem.answeredCount++; coord.freeSem.attemptedCount++; }
                    else if (callStat === 'no_answer') { phaseObj.noAnswer++; coord.freeSem.attemptedCount++; }
                    else if (callStat === 'reject') { phaseObj.reject++; coord.freeSem.coveredCount++; coord.freeSem.attemptedCount++; }
                    else { phaseObj.pending++; }
                } else {
                    coord.afterSem.assignedCount++;
                    coord.afterSem.messagesReceived += msgStats.inbound;
                    coord.afterSem.messagesSent += msgStats.outbound;
                    const isNewInq = l.inquiryType === 'NEW_INQ';
                    const targetSection = isNewInq ? coord.afterSem.newInq : coord.afterSem.openSem;
                    targetSection.assignedCount++;
                    coord.afterSem.combinedTotals.totalLeads++;
                    if (isPaid) { targetSection.paidCount++; coord.afterSem.combinedTotals.totalPaid++; }
                    else { targetSection.nonEnrolledCount++; coord.afterSem.combinedTotals.totalNonEnrolled++; }

                    const roundNum = isNewInq ? (l.newInqRound || l.coordinationRound || 1) : (l.openSemRound || l.coordinationRound || 1);
                    const rawStatus = isNewInq ? (l.newInqCallStatus || l.callStatus) : (l.openSemCallStatus || l.callStatus);
                    const normalized = normalizeStatus(rawStatus);
                    const roundObj = roundNum === 2 ? targetSection.round2 : targetSection.round1;
                    if (normalized === 'pending') roundObj.pending++;
                    else if (normalized === 'no_answer') { roundObj.noAnswer++; roundObj.active++; }
                    else if (normalized === 'reject') roundObj.reject++;
                    else roundObj.active++;
                }
            }
        });

        // Compute percentages
        Object.values(coordinatorMap).forEach(coord => {
            if (coord.freeSem.attemptedCount > 0) coord.freeSem.callAnswerRate = Math.round((coord.freeSem.answeredCount / coord.freeSem.attemptedCount) * 100);
            if (coord.afterSem.openSem.assignedCount > 0) {
                coord.afterSem.openSem.paidPercentage = Math.round((coord.afterSem.openSem.paidCount / coord.afterSem.openSem.assignedCount) * 100);
                coord.afterSem.openSem.nonEnrolledPercentage = Math.round((coord.afterSem.openSem.nonEnrolledCount / coord.afterSem.openSem.assignedCount) * 100);
            }
            if (coord.afterSem.newInq.assignedCount > 0) {
                coord.afterSem.newInq.paidPercentage = Math.round((coord.afterSem.newInq.paidCount / coord.afterSem.newInq.assignedCount) * 100);
                coord.afterSem.newInq.nonEnrolledPercentage = Math.round((coord.afterSem.newInq.nonEnrolledCount / coord.afterSem.newInq.assignedCount) * 100);
            }
        });

        // Build date-wise breakdown list
        let datesList = [];
        if (startDate && endDate) {
            let cur = new Date(startDate);
            const endD = new Date(endDate);
            while (cur <= endD) {
                datesList.push(cur.toISOString().split('T')[0]);
                cur.setDate(cur.getDate() + 1);
            }
        } else {
            for (let i = 13; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                datesList.push(d.toISOString().split('T')[0]);
            }
        }

        const coordIds = Object.keys(coordinatorMap).map(id => parseInt(id)).filter(id => !isNaN(id));

        if (coordIds.length > 0 && datesList.length > 0) {
            const rangeStart = new Date(datesList[0] + 'T00:00:00.000Z');
            const rangeEnd = new Date(datesList[datesList.length - 1] + 'T23:59:59.999Z');

            const rangeMessages = await prisma.chatMessage.findMany({
                where: { senderId: { in: coordIds }, direction: { in: ['outbound', 'out', 'OUT'] }, createdAt: { gte: rangeStart, lte: rangeEnd } },
                select: { senderId: true, leadId: true, createdAt: true, lead: { select: { campaignType: true, phone: true } } }
            });

            const rangeCalls = await prisma.callCampaignAuditLog.findMany({
                where: { actionedById: { in: coordIds }, createdAt: { gte: rangeStart, lte: rangeEnd } },
                select: { actionedById: true, leadId: true, campaignCategory: true, createdAt: true }
            });

            Object.values(coordinatorMap).forEach(coord => {
                const cId = coord.id;
                const dailyMap = {};
                datesList.forEach(d => {
                    dailyMap[d] = { date: d, freeMsgUnique: new Set(), freeMsgTotal: 0, allMsgUnique: new Set(), allMsgTotal: 0, freeCallsUnique: new Set(), freeCallsTotal: 0, allCallsUnique: new Set(), allCallsTotal: 0 };
                });

                const cMsgs = rangeMessages.filter(m => m.senderId === cId);
                cMsgs.forEach(m => {
                    const dKey = m.createdAt.toISOString().split('T')[0];
                    if (dailyMap[dKey]) {
                        dailyMap[dKey].allMsgTotal++;
                        if (m.leadId) dailyMap[dKey].allMsgUnique.add(m.leadId);
                        const isFree = m.lead?.campaignType === 'FREE_SEMINAR' || (m.lead?.phone && !m.lead.phone.includes('_AS'));
                        if (isFree) { dailyMap[dKey].freeMsgTotal++; if (m.leadId) dailyMap[dKey].freeMsgUnique.add(m.leadId); }
                    }
                });

                const cCalls = rangeCalls.filter(c => c.actionedById === cId);
                cCalls.forEach(c => {
                    const dKey = c.createdAt.toISOString().split('T')[0];
                    if (dailyMap[dKey]) {
                        dailyMap[dKey].allCallsTotal++;
                        if (c.leadId) dailyMap[dKey].allCallsUnique.add(c.leadId);
                        const isFree = c.campaignCategory === 'FREE_SEMINAR';
                        if (isFree) { dailyMap[dKey].freeCallsTotal++; if (c.leadId) dailyMap[dKey].freeCallsUnique.add(c.leadId); }
                    }
                });

                const overallFreeMsgUnq = new Set();
                const overallAllMsgUnq = new Set();
                const overallFreeCallsUnq = new Set();
                const overallAllCallsUnq = new Set();

                cMsgs.forEach(m => {
                    if (m.leadId) {
                        overallAllMsgUnq.add(m.leadId);
                        if (m.lead?.campaignType === 'FREE_SEMINAR' || (m.lead?.phone && !m.lead.phone.includes('_AS'))) overallFreeMsgUnq.add(m.leadId);
                    }
                });
                cCalls.forEach(c => {
                    if (c.leadId) {
                        overallAllCallsUnq.add(c.leadId);
                        if (c.campaignCategory === 'FREE_SEMINAR') overallFreeCallsUnq.add(c.leadId);
                    }
                });

                coord.dateWiseBreakdown = datesList.map(d => ({
                    date: d,
                    freeMsgUnique: dailyMap[d].freeMsgUnique.size,
                    freeMsgTotal: dailyMap[d].freeMsgTotal,
                    allMsgUnique: dailyMap[d].allMsgUnique.size,
                    allMsgTotal: dailyMap[d].allMsgTotal,
                    freeCallsUnique: dailyMap[d].freeCallsUnique.size,
                    freeCallsTotal: dailyMap[d].freeCallsTotal,
                    allCallsUnique: dailyMap[d].allCallsUnique.size,
                    allCallsTotal: dailyMap[d].allCallsTotal
                }));

                coord.dateWiseTotals = {
                    freeMsgUniqueNet: overallFreeMsgUnq.size,
                    freeMsgTotal: cMsgs.filter(m => m.lead?.campaignType === 'FREE_SEMINAR' || (m.lead?.phone && !m.lead.phone.includes('_AS'))).length,
                    allMsgUniqueNet: overallAllMsgUnq.size,
                    allMsgTotal: cMsgs.length,
                    freeCallsUniqueNet: overallFreeCallsUnq.size,
                    freeCallsTotal: cCalls.filter(c => c.campaignCategory === 'FREE_SEMINAR').length,
                    allCallsUniqueNet: overallAllCallsUnq.size,
                    allCallsTotal: cCalls.length
                };
            });
        }

        let coordinatorsToExport = Object.values(coordinatorMap).filter(coord => {
            if (coordinatorId && coordinatorId !== 'ALL' && coordinatorId !== 'undefined' && coordinatorId !== 'null') {
                return String(coord.id) === String(coordinatorId);
            }
            return coord.totalAssigned > 0 || 
                   (coord.dateWiseTotals && (coord.dateWiseTotals.allMsgTotal > 0 || coord.dateWiseTotals.allCallsTotal > 0));
        });

        let bizName = "All Businesses";
        if (businessId && businessId !== 'ALL') {
            const bizObj = await prisma.business.findUnique({ where: { id: parseInt(businessId) } });
            if (bizObj) bizName = bizObj.name;
        }

        const createCoordDocSection = (coord) => {
            const tableHeaderBg = '1E293B';
            const headerCell = (text, width = 14) => new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 18 })], alignment: AlignmentType.CENTER })],
                shading: { fill: tableHeaderBg, type: ShadingType.CLEAR },
                width: { size: width, type: WidthType.PERCENTAGE }
            });

            const bodyCell = (text, isBold = false, color = '0F172A', align = AlignmentType.CENTER) => new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: String(text), bold: isBold, color, size: 18 })], alignment: align })]
            });

            const tableRows = [
                new TableRow({
                    children: [
                        headerCell('Date', 16),
                        headerCell('Free Sem Unique', 14),
                        headerCell('Free Sem Msgs', 14),
                        headerCell('Free Sem Calls', 14),
                        headerCell('All Unique', 14),
                        headerCell('All Msgs', 14),
                        headerCell('All Calls', 14)
                    ]
                })
            ];

            (coord.dateWiseBreakdown || []).forEach(item => {
                tableRows.push(new TableRow({
                    children: [
                        bodyCell(item.date, true, '334155', AlignmentType.LEFT),
                        bodyCell(item.freeMsgUnique, true, '2563EB'),
                        bodyCell(item.freeMsgTotal),
                        bodyCell(item.freeCallsTotal),
                        bodyCell(item.allMsgUnique, true, '059669'),
                        bodyCell(item.allMsgTotal),
                        bodyCell(item.allCallsTotal)
                    ]
                }));
            });

            const totals = coord.dateWiseTotals || {};
            tableRows.push(new TableRow({
                children: [
                    bodyCell('TOTAL (Net)', true, '0F172A', AlignmentType.LEFT),
                    bodyCell(`${totals.freeMsgUniqueNet || 0} Unique`, true, '2563EB'),
                    bodyCell(`${totals.freeMsgTotal || 0} Msgs`, true, '0F172A'),
                    bodyCell(`${totals.freeCallsTotal || 0} Calls`, true, '0F172A'),
                    bodyCell(`${totals.allMsgUniqueNet || 0} Unique`, true, '059669'),
                    bodyCell(`${totals.allMsgTotal || 0} Msgs`, true, '0F172A'),
                    bodyCell(`${totals.allCallsTotal || 0} Calls`, true, '0F172A')
                ]
            }));

            const free = coord.freeSem || {};
            const after = coord.afterSem || {};

            return [
                new Paragraph({ text: `COORDINATOR REPORT: ${coord.name.toUpperCase()}`, heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 150 } }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "• Total Assigned Leads: ", bold: true }),
                        new TextRun({ text: `${coord.totalAssigned || 0} (Free Sem: ${free.assignedCount || 0} | After Sem: ${after.assignedCount || 0})\n` }),
                        new TextRun({ text: "• Paid Conversions: ", bold: true }),
                        new TextRun({ text: `${after.combinedTotals?.totalPaid || 0}  |  ` }),
                        new TextRun({ text: "Non-Enrolled: ", bold: true }),
                        new TextRun({ text: `${after.combinedTotals?.totalNonEnrolled || 0}\n` }),
                        new TextRun({ text: "• Free Sem Call Answer Rate: ", bold: true }),
                        new TextRun({ text: `${free.callAnswerRate || 0}% (Covered: ${free.coveredCount || 0} / ${free.assignedCount || 0})\n` }),
                        new TextRun({ text: "• Free Sem Phase 1: ", bold: true }),
                        new TextRun({ text: `Answer: ${free.phase1?.answer || 0} | No Ans: ${free.phase1?.noAnswer || 0} | Pending: ${free.phase1?.pending || 0} | Reject: ${free.phase1?.reject || 0}\n` }),
                        new TextRun({ text: "• Free Sem Phase 2: ", bold: true }),
                        new TextRun({ text: `Answer: ${free.phase2?.answer || 0} | No Ans: ${free.phase2?.noAnswer || 0} | Pending: ${free.phase2?.pending || 0} | Reject: ${free.phase2?.reject || 0}\n` }),
                        new TextRun({ text: "• After Sem Round 1: ", bold: true }),
                        new TextRun({ text: `Active: ${after.newInq?.round1?.active || 0} | Pending: ${after.newInq?.round1?.pending || 0} | No Ans: ${after.newInq?.round1?.noAnswer || 0} | Reject: ${after.newInq?.round1?.reject || 0}\n` }),
                        new TextRun({ text: "• After Sem Round 2: ", bold: true }),
                        new TextRun({ text: `Active: ${after.newInq?.round2?.active || 0} | Pending: ${after.newInq?.round2?.pending || 0} | No Ans: ${after.newInq?.round2?.noAnswer || 0} | Reject: ${after.newInq?.round2?.reject || 0}` })
                    ],
                    spacing: { after: 200 }
                }),
                new Paragraph({ text: `Date-Wise Activity Breakdown:`, heading: HeadingLevel.HEADING_2, spacing: { before: 150, after: 100 } }),
                new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }),
                new Paragraph({ text: "", spacing: { after: 400 } })
            ];
        };

        const docChildren = [
            new Paragraph({ text: "IMA CAMPUS - COORDINATOR PERFORMANCE AUDIT REPORT", heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, spacing: { after: 100 } }),
            new Paragraph({
                children: [
                    new TextRun({ text: "Business Scope: ", bold: true }),
                    new TextRun({ text: `${bizName}  |  ` }),
                    new TextRun({ text: "Date Range: ", bold: true }),
                    new TextRun({ text: `${startDate || 'Default 14 Days'} to ${endDate || 'Today'}  |  ` }),
                    new TextRun({ text: "Generated: ", bold: true }),
                    new TextRun({ text: new Date().toLocaleDateString('en-US') })
                ],
                alignment: AlignmentType.CENTER, spacing: { after: 400 }
            })
        ];

        coordinatorsToExport.forEach(coord => {
            docChildren.push(...createCoordDocSection(coord));
        });

        const doc = new Document({ sections: [{ properties: {}, children: docChildren }] });
        const buffer = await Packer.toBuffer(doc);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename=Coordinator_Performance_Report_${Date.now()}.docx`);
        return res.send(buffer);

    } catch (error) {
        console.error("Export Word Doc Error:", error);
        return res.status(500).json({ error: "Failed to export Word document" });
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
        if (await isOpenSeminarLocked(batchId)) {
            const openSemCount = await prisma.lead.count({
                where: {
                    id: { in: leadIds.map(id => parseInt(id)) },
                    inquiryType: { in: ['OPEN_SEMINAR', 'NORMAL'] }
                }
            });
            if (openSemCount > 0) {
                return res.status(403).json({ error: "Opening Seminar campaign for this batch is locked by Management. Cannot assign Open Seminar leads to it." });
            }
        }

        const parsedLeadIds = leadIds.map(id => parseInt(id));
        const result = await prisma.lead.updateMany({
            where: { id: { in: parsedLeadIds } },
            data: { 
                batchId,
                callStatus: 'pending',
                openSemCallStatus: 'pending',
                newInqCallStatus: 'pending',
                phase: 1,
                openSemPhase: 1,
                newInqPhase: 1,
                callAttempt: 1,
                openSemCallAttempt: 1,
                newInqCallAttempt: 1,
                coordinationRound: 1,
                openSemRound: 1,
                newInqRound: 1,
                feedback: '',
                openSemFeedback: '',
                newInqFeedback: '',
                callMethod: null,
                openSemCallMethod: null,
                newInqCallMethod: null,
                nonEnrolledReason: null,
                r1DelayedDays: 0,
                r2DelayedDays: 0,
                lastAttemptAt: null
            }
        });

        await prisma.leadRoundProgress.deleteMany({
            where: { leadId: { in: parsedLeadIds } }
        }).catch(() => {});

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
        if (!businessId) return res.status(400).json({ error: "businessId is required" });

        const missingStudents = await computeVerifiedMissingStudents(businessId, batchId);
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

// Update Missing Student Web Profile Phone Number
exports.updateMissingStudentPhone = async (req, res) => {
    try {
        const { studentId, newPhone, businessId, batchId } = req.body;
        if (!studentId || !newPhone) {
            return res.status(400).json({ error: "studentId and newPhone are required" });
        }

        const student = await prisma.user.findUnique({ where: { id: parseInt(studentId) } });
        if (!student) return res.status(404).json({ error: "Student not found" });

        const cleanNewPhone = newPhone.replace(/[^0-9]/g, '');
        if (cleanNewPhone.length < 7) {
            return res.status(400).json({ error: "Invalid phone number length (min 7 digits)" });
        }

        const oldPhone = student.phone || student.whatsapp || student.optionalPhone;

        // Update student profile with new primary phone and keep old in optional
        await prisma.user.update({
            where: { id: parseInt(studentId) },
            data: {
                phone: cleanNewPhone,
                optionalPhone: oldPhone && oldPhone !== cleanNewPhone ? oldPhone : student.optionalPhone
            }
        });

        // Check if any CRM Lead exists with cleanNewPhone suffix
        const suffix = cleanNewPhone.slice(-7);
        const whereClause = buildStatsWhereClause(businessId, batchId, null, null, { campaignType: { in: ['AFTER_SEMINAR', 'FREE_SEMINAR'] } });
        const matchingLeads = await prisma.lead.findMany({
            where: whereClause
        });

        let updatedLeadCount = 0;
        for (const l of matchingLeads) {
            if (l.phone && l.phone.replace(/[^0-9]/g, '').slice(-7) === suffix) {
                await prisma.lead.update({
                    where: { id: l.id },
                    data: { enrollmentStatus: 'ENROLLED', paymentIntention: 'FULL' }
                });
                updatedLeadCount++;
            }
        }

        res.status(200).json({
            success: true,
            message: `Student phone updated to ${cleanNewPhone}. Matched & updated ${updatedLeadCount} CRM lead(s).`,
            student: { id: student.id, phone: cleanNewPhone }
        });
    } catch (error) {
        console.error("updateMissingStudentPhone Error:", error);
        res.status(500).json({ error: "Failed to update student phone" });
    }
};

// Search CRM Leads for merging with Web Student
exports.searchCrmLeadsForMerge = async (req, res) => {
    try {
        const { businessId, batchId, query } = req.query;
        if (!businessId) return res.status(400).json({ error: "businessId is required" });
        if (!query || query.trim().length < 2) return res.status(200).json({ leads: [] });

        const cleanQ = query.trim();
        const numQ = cleanQ.replace(/[^0-9]/g, '');

        const whereClause = buildStatsWhereClause(businessId, batchId, null, null, {
            campaignType: { in: ['AFTER_SEMINAR', 'FREE_SEMINAR'] }
        });

        // Search leads by phone or name
        const leads = await prisma.lead.findMany({
            where: {
                ...whereClause,
                OR: [
                    { name: { contains: cleanQ } },
                    { phone: { contains: numQ.length >= 4 ? numQ : cleanQ } }
                ]
            },
            include: {
                assignedUser: { select: { id: true, firstName: true, lastName: true, role: true } },
                batch: { select: { id: true, name: true } }
            },
            take: 25
        });

        const formattedLeads = leads.map(l => {
            const cleanPhone = l.phone ? l.phone.split('_')[0] : '';
            const coordName = l.assignedUser ? `${l.assignedUser.firstName || ''} ${l.assignedUser.lastName || ''}`.trim() : 'Unassigned';
            return {
                id: l.id,
                name: l.name || 'Unnamed Lead',
                phone: cleanPhone,
                rawPhone: l.phone,
                batchName: l.batch?.name || 'Default Batch',
                coordinatorId: l.assignedTo,
                coordinatorName: coordName,
                enrollmentStatus: l.enrollmentStatus,
                inquiryType: l.inquiryType,
                round: l.inquiryType === 'NEW_INQ' ? l.newInqRound : l.openSemRound,
                callStatus: l.inquiryType === 'NEW_INQ' ? l.newInqCallStatus : l.openSemCallStatus
            };
        });

        res.status(200).json({ leads: formattedLeads });
    } catch (error) {
        console.error("searchCrmLeadsForMerge Error:", error);
        res.status(500).json({ error: "Failed to search CRM leads" });
    }
};

// Merge Web Student with Existing CRM Lead (Phone Link / Alias Merge)
exports.mergeMissingStudentWithLead = async (req, res) => {
    try {
        const { studentId, leadId, businessId, batchId } = req.body;
        if (!studentId || !leadId) {
            return res.status(400).json({ error: "studentId and leadId are required" });
        }

        const student = await prisma.user.findUnique({ where: { id: parseInt(studentId) } });
        if (!student) return res.status(404).json({ error: "Student not found" });

        const lead = await prisma.lead.findUnique({
            where: { id: parseInt(leadId) },
            include: { assignedUser: true }
        });
        if (!lead) return res.status(404).json({ error: "CRM Lead not found" });

        const leadCleanPhone = lead.phone ? lead.phone.split('_')[0].replace(/[^0-9]/g, '') : '';
        const studentCleanPhone = (student.phone || student.whatsapp || student.optionalPhone || '').replace(/[^0-9]/g, '');

        // 1. Link lead's phone to student's user profile (optionalPhone or whatsapp)
        await prisma.user.update({
            where: { id: parseInt(studentId) },
            data: {
                whatsapp: leadCleanPhone || student.whatsapp,
                optionalPhone: studentCleanPhone && studentCleanPhone !== leadCleanPhone ? studentCleanPhone : student.optionalPhone
            }
        });

        // 2. Update CRM Lead to 'ENROLLED' while strictly preserving assignedTo coordinator
        const updatedLead = await prisma.lead.update({
            where: { id: parseInt(leadId) },
            data: {
                enrollmentStatus: 'ENROLLED',
                paymentIntention: 'FULL',
                openSemRound: 3,
                newInqRound: 3
            }
        });

        const coordName = lead.assignedUser ? `${lead.assignedUser.firstName || ''} ${lead.assignedUser.lastName || ''}`.trim() : 'Assigned Coordinator';

        res.status(200).json({
            success: true,
            message: `Successfully merged student with CRM Lead (${lead.name || leadCleanPhone}). Attributed to coordinator ${coordName}!`,
            lead: updatedLead
        });
    } catch (error) {
        console.error("mergeMissingStudentWithLead Error:", error);
        res.status(500).json({ error: "Failed to merge student with lead" });
    }
};

// Internal helpers exported for callWorkloadController
exports.buildStatsWhereClause = buildStatsWhereClause;
exports.getActiveStaffIds = getActiveStaffIds;
exports.getVerifiedPhones = getVerifiedPhones;
exports.getPrimaryEnrolledLeadIds = getPrimaryEnrolledLeadIds;
exports.isCallCenterUser = isCallCenterUser;
exports.resolveTargetBizName = resolveTargetBizName;
exports.isStaffInBusiness = isStaffInBusiness;
exports.buildMultiBatchGuard = buildMultiBatchGuard;
exports.getLast9Digits = getLast9Digits;
