const { PrismaClient } = require('@prisma/client');
const prisma = require('../src/core/db');

// Helper to filter leads by business safely
const buildLeadFilter = (bizId, batId) => {
    let whereClause = {};
    if (batId) {
        whereClause.batchId = batId;
    } else if (bizId) {
        whereClause.OR = [
            { phone: { endsWith: `_BIZ_${bizId}` } },
            { phone: { endsWith: `_BIZ_${bizId}_AS` } },
            { phone: { contains: `_BIZ_${bizId}_BATCH_` } },
            { phone: { contains: `_BIZ_${bizId}_ROUND_` } },
            { phone: { contains: `_BIZ_${bizId}_HISTORY_ROUND_` } }
        ];
    }
    return whereClause;
};

exports.getManagerDashboardOverview = async (req, res) => {
    try {
        const { businessId, batchId } = req.query;

        // Date calculations
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        const daysMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const currentDayName = daysMap[startOfDay.getDay()];

        const bizId = businessId && businessId !== 'ALL' ? parseInt(businessId) : null;
        const batId = batchId && batchId !== 'ALL' && batchId !== 'UNASSIGNED' ? parseInt(batchId) : null;

        // 1. Basic Filters
        let batchQuery = {};
        if (batId) batchQuery.id = batId;
        else if (bizId) batchQuery.businessId = bizId;

        let businessQuery = {};
        if (bizId) businessQuery.id = bizId;

        let deliveryQuery = {};
        if (bizId) deliveryQuery.businessId = bizId;

        // 2. Active Students & Verified Revenue (From Payments)
        let activeStudentsCount = 0;
        let totalRevenue = 0;
        let mixerData = [];

        let paymentWhere = { status: 1, amount: { gt: 0 } };
        if (batId) paymentWhere.batchId = batId;
        else if (bizId) paymentWhere.businessId = bizId;

        const payments = await prisma.payment.findMany({
            where: paymentWhere,
            select: { amount: true, studentId: true, payment_type: true, subjects: true }
        });

        // Calculate Revenue & Unique Active Students
        const uniqueStudentIds = new Set();
        payments.forEach(p => {
            totalRevenue += (p.amount || 0);
            if (p.studentId) uniqueStudentIds.add(p.studentId);
        });
        activeStudentsCount = uniqueStudentIds.size;

        // Subject breakdown
        const allCourses = await prisma.course.findMany({ select: { id: true, name: true } });
        const globalCourseMap = {};
        allCourses.forEach(c => globalCourseMap[c.id] = c.name.trim().toUpperCase());

        const subjectAggregates = {};
        allCourses.forEach(c => {
            const upName = c.name.trim().toUpperCase();
            subjectAggregates[upName] = { subject: c.name, full: 0, monthly: 0, installment: 0 };
        });

        const studentPaymentMap = {};
        payments.forEach(p => {
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

        Object.values(studentPaymentMap).forEach(studentData => {
            studentData.subjects.forEach(sub => {
                if (subjectAggregates[sub]) {
                    if (studentData.typeStr === 'FULL') subjectAggregates[sub].full++;
                    else if (studentData.typeStr === 'MONTHLY') subjectAggregates[sub].monthly++;
                    else if (studentData.typeStr === 'INSTALLMENT') subjectAggregates[sub].installment++;
                }
            });
        });
        mixerData = Object.values(subjectAggregates).filter(s => s.full > 0 || s.monthly > 0 || s.installment > 0);

        // 3. Active Batches Count
        const activeBatchesCount = await prisma.batch.count({
            where: { ...businessQuery, status: 1 }
        });

        // 4. Leads & CRM Stats
        const leadFilter = buildLeadFilter(bizId, batId);
        const leads = await prisma.lead.findMany({
            where: leadFilter,
            select: { id: true, assignedTo: true, source: true, inquiryType: true }
        });

        let leadStats = { total: leads.length, assigned: 0, unassigned: 0, openSem: 0, newInq: 0, bridge: 0 };
        const leadIds = [];
        leads.forEach(l => {
            leadIds.push(l.id);
            if (l.assignedTo) leadStats.assigned++;
            else leadStats.unassigned++;

            if (l.source === 'bridge_transfer') leadStats.bridge++;
            else if (l.inquiryType === 'NEW_INQ') leadStats.newInq++;
            else leadStats.openSem++;
        });

        // CRM WhatsApp Messages Today
        let crmMessages = { received: 0, replied: 0 };
        if (leadIds.length > 0) {
            const todayMessages = await prisma.chatMessage.findMany({
                where: {
                    leadId: { in: leadIds },
                    createdAt: { gte: startOfDay, lte: endOfDay }
                },
                select: { direction: true }
            });
            crmMessages.received = todayMessages.filter(m => m.direction === 'inbound').length;
            crmMessages.replied = todayMessages.filter(m => m.direction === 'outbound').length;
        }

        // Today's Lead Coverage (Coordinator-Wise)
        let coordinatorStats = [];
        if (leadIds.length > 0) {
            const todayProgresses = await prisma.leadRoundProgress.findMany({
                where: {
                    leadId: { in: leadIds },
                    updatedAt: { gte: startOfDay, lte: endOfDay }
                },
                include: { lead: { include: { assignedUser: true } } }
            });

            const coordinatorMap = {};
            todayProgresses.forEach(prog => {
                if (prog.lead && prog.lead.assignedUser) {
                    const name = `${prog.lead.assignedUser.firstName} ${prog.lead.assignedUser.lastName}`;
                    if (!coordinatorMap[name]) coordinatorMap[name] = new Set();
                    coordinatorMap[name].add(prog.leadId);
                }
            });
            coordinatorStats = Object.keys(coordinatorMap).map(name => ({
                name,
                leadsCovered: coordinatorMap[name].size
            }));
        }

        // 5. Today's Classes (Timetable)
        let timetableQuery = { date: { gte: startOfDay, lte: endOfDay } };
        if (batId) timetableQuery.batchId = batId;
        else if (bizId) {
            const bizBatches = await prisma.batch.findMany({ where: { businessId: bizId }, select: { id: true } });
            timetableQuery.batchId = { in: bizBatches.map(b => b.id) };
        }

        const todayClasses = await prisma.timetable.findMany({
            where: timetableQuery,
            include: { hall: true, batch: true },
            orderBy: { startTime: 'asc' }
        });

        // 6. Delivery Quick Stats
        const deliveries = await prisma.delivery.findMany({
            where: deliveryQuery,
            select: { status: true }
        });
        
        let deliveryStats = { pending: 0, dispatched: 0, delivered: 0, hold: 0 };
        deliveries.forEach(d => {
            if (d.status === 'Pending') deliveryStats.pending++;
            else if (d.status === 'Hold') deliveryStats.hold++;
            else if (d.status === 'Received' || d.status === 'Delivered') deliveryStats.delivered++;
            else deliveryStats.dispatched++; // Packed, On the way
        });

        // 7. System Tasks (Pending tasks for staff in this business)
        // Find staff assigned to this business
        let staffFilter = { role: { notIn: ['Student', 'USER', 'STUDENT'] } };
        // We will just fetch all pending tasks for now since branch separation for tasks is complex
        const pendingTasks = await prisma.task.count({
            where: { status: 'PENDING' }
        });

        // 8. Student Age Distribution from NIC
        const studentIdsArr = Array.from(uniqueStudentIds);
        let studentUsers = [];
        if (studentIdsArr.length > 0) {
            studentUsers = await prisma.user.findMany({
                where: { id: { in: studentIdsArr } },
                select: { nic: true }
            });
        }

        const currentYear = new Date().getFullYear();
        const ageCountMap = {
            '18 - 19 Yrs': 0,
            'Under 18': 0,
            '25+ Yrs': 0,
            '20 - 21 Yrs': 0,
            '22 - 24 Yrs': 0
        };
        let totalWithAge = 0;
        const agesList = [];

        studentUsers.forEach(u => {
            if (!u.nic) return;
            const clean = String(u.nic).trim().toUpperCase();
            let birthYear = null;
            if (clean.length === 12 && /^\d{12}$/.test(clean)) {
                birthYear = parseInt(clean.substring(0, 4));
            } else if ((clean.length === 10 || clean.length === 9) && /^\d{9}[VX]?$/.test(clean)) {
                const yy = parseInt(clean.substring(0, 2));
                birthYear = yy >= 30 ? 1900 + yy : 2000 + yy;
            }
            if (birthYear && birthYear > 1940 && birthYear <= currentYear) {
                const age = currentYear - birthYear;
                totalWithAge++;
                agesList.push(age);
                if (age < 18) ageCountMap['Under 18']++;
                else if (age <= 19) ageCountMap['18 - 19 Yrs']++;
                else if (age <= 21) ageCountMap['20 - 21 Yrs']++;
                else if (age <= 24) ageCountMap['22 - 24 Yrs']++;
                else ageCountMap['25+ Yrs']++;
            }
        });

        const medianAge = agesList.length > 0 
            ? agesList.sort((a,b)=>a-b)[Math.floor(agesList.length / 2)] 
            : 20;

        const studentAgeStats = {
            totalAnalyzed: totalWithAge,
            medianAge,
            groups: [
                { group: '18 - 19 Yrs', count: ageCountMap['18 - 19 Yrs'], pct: totalWithAge > 0 ? Math.round((ageCountMap['18 - 19 Yrs'] / totalWithAge) * 1000) / 10 : 0, color: '#06b6d4', glow: '#22d3ee', tag: 'Core A/L' },
                { group: 'Under 18', count: ageCountMap['Under 18'], pct: totalWithAge > 0 ? Math.round((ageCountMap['Under 18'] / totalWithAge) * 1000) / 10 : 0, color: '#10b981', glow: '#34d399', tag: 'O/L / School' },
                { group: '25+ Yrs', count: ageCountMap['25+ Yrs'], pct: totalWithAge > 0 ? Math.round((ageCountMap['25+ Yrs'] / totalWithAge) * 1000) / 10 : 0, color: '#f59e0b', glow: '#fbbf24', tag: 'Adult / Pro' },
                { group: '20 - 21 Yrs', count: ageCountMap['20 - 21 Yrs'], pct: totalWithAge > 0 ? Math.round((ageCountMap['20 - 21 Yrs'] / totalWithAge) * 1000) / 10 : 0, color: '#a855f7', glow: '#c084fc', tag: 'Higher Dip' },
                { group: '22 - 24 Yrs', count: ageCountMap['22 - 24 Yrs'], pct: totalWithAge > 0 ? Math.round((ageCountMap['22 - 24 Yrs'] / totalWithAge) * 1000) / 10 : 0, color: '#ec4899', glow: '#f472b6', tag: 'Degree' }
            ]
        };

        res.status(200).json({
            activeStudentsCount,
            totalRevenue,
            activeBatchesCount,
            crmMessages,
            coordinatorStats,
            todayClasses,
            leadStats,
            mixerData,
            deliveryStats,
            pendingTasks,
            studentAgeStats
        });

    } catch (error) {
        console.error("Manager Overview Stats Error:", error);
        res.status(500).json({ error: "Failed to fetch manager overview stats" });
    }
};
