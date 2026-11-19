const { PrismaClient } = require('@prisma/client');
const prisma = require('../src/core/db');
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

exports.getCoordinatorV2Stats = async (req, res) => {
    try {
        const userId = parseInt(req.user?.userId || req.user?.id || req.query.loggedUserId);
        if (!userId || isNaN(userId)) {
            return res.status(401).json({ error: "Unauthorized. Missing user ID." });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true, businessType: true }
        });

        if (!user) return res.status(404).json({ error: "User not found." });

        const userRole = String(user.role).toUpperCase().replace(/ /g, '_');
        const isAdmin = ['SYSTEM_ADMIN', 'DIRECTOR', 'SUPER'].includes(userRole);
        const isManager = ['MANAGER', 'ASS_MANAGER'].includes(userRole);

        // Fetch assigned businesses for Manager/Admin
        let assignedBusinessIds = [];
        if (isManager || isAdmin) {
            if (isAdmin) {
                const allBiz = await prisma.business.findMany({ select: { id: true } });
                assignedBusinessIds = allBiz.map(b => b.id);
            } else {
                const allBiz = await prisma.business.findMany();
                const matches = [];
                allBiz.forEach(biz => {
                    const isManagerOf = biz.head_manager_id === userId || biz.ass_manager_id === userId;
                    const matchesBizType = user.businessType && (
                        String(biz.id) === String(user.businessType).trim() ||
                        biz.name.toLowerCase().trim() === String(user.businessType).toLowerCase().trim() ||
                        biz.name.toLowerCase().includes(String(user.businessType).toLowerCase().trim()) ||
                        String(user.businessType).toLowerCase().trim().includes(biz.name.toLowerCase().trim())
                    );
                    if (isManagerOf || matchesBizType) matches.push(biz.id);
                });
                assignedBusinessIds = matches;
            }
        }

        const { businessId, batchId } = req.query;
        let baseLeadFilter = {};

        if (isAdmin || isManager) {
            if (batchId && batchId !== '' && batchId !== 'undefined' && batchId !== 'null') {
                baseLeadFilter.batchId = parseInt(batchId);
            } else if (businessId && businessId !== '' && businessId !== 'undefined' && businessId !== 'null') {
                const bizBatches = await prisma.batch.findMany({ where: { businessId: parseInt(businessId) }, select: { id: true } });
                baseLeadFilter.OR = [
                    { batchId: { in: bizBatches.map(b => b.id) } },
                    { phone: { endsWith: `_BIZ_${businessId}` } },
                    { phone: { contains: `_BIZ_${businessId}_` } }
                ];
            } else if (assignedBusinessIds.length > 0) {
                const bizBatches = await prisma.batch.findMany({ where: { businessId: { in: assignedBusinessIds } }, select: { id: true } });
                baseLeadFilter.OR = [
                    { batchId: { in: bizBatches.map(b => b.id) } },
                    ...assignedBusinessIds.flatMap(id => [
                        { phone: { endsWith: `_BIZ_${id}` } },
                        { phone: { contains: `_BIZ_${id}_` } }
                    ])
                ];
            } else {
                baseLeadFilter.batch = { businessId: -1 };
            }
        } else {
            baseLeadFilter.assignedTo = userId;
        }

        // ==========================================
        // 1. OVERALL METRICS
        // ==========================================
        const totalAssigned = await prisma.lead.count({ where: { ...baseLeadFilter, ...( (isAdmin || isManager) ? { assignedTo: { not: null } } : {} ) } });
        const totalEnrolled = await prisma.lead.count({ where: { ...baseLeadFilter, enrollmentStatus: 'ENROLLED' } });
        const totalPending = await prisma.lead.count({ where: { ...baseLeadFilter, callStatus: 'pending' } });
        const totalCovered = await prisma.lead.count({ where: { ...baseLeadFilter, callStatus: { not: 'pending' } } });
        const callAnswerCount = await prisma.lead.count({ where: { ...baseLeadFilter, callStatus: 'answer' } });

        const conversionRate = totalAssigned > 0 ? ((totalEnrolled / totalAssigned) * 100).toFixed(1) : 0;
        const responseRate = totalCovered > 0 ? ((callAnswerCount / totalCovered) * 100).toFixed(1) : 0;

        // ==========================================
        // 2. TODAY METRICS (Messages & Coverages)
        // ==========================================
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Calculate Messages Sent/Received TODAY for assigned leads
        const todayChats = await prisma.chatMessage.findMany({
            where: {
                createdAt: { gte: today },
                lead: { ...baseLeadFilter }
            },
            select: { direction: true, lead: { select: { phone: true } } }
        });

        let msgsSent = 0;
        let msgsReceived = 0;
        const uniqueNumbers = new Set();

        todayChats.forEach(chat => {
            if (chat.direction === 'outbound') msgsSent++;
            if (chat.direction === 'inbound') msgsReceived++;
            if (chat.lead?.phone) uniqueNumbers.add(chat.lead.phone);
        });

        // Leads covered today
        const coveredToday = await prisma.lead.groupBy({
            by: ['inquiryType'],
            where: {
                ...baseLeadFilter,
                updatedAt: { gte: today },
                callStatus: { not: 'pending' }
            },
            _count: true
        });

        const todayCovers = {
            newInq: coveredToday.find(c => c.inquiryType === 'NEW_INQ')?._count || 0,
            openSem: coveredToday.find(c => c.inquiryType === 'OPEN_SEMINAR')?._count || 0,
            paid: coveredToday.find(c => c.inquiryType === 'PAID_CAMP')?._count || 0
        };

        // ==========================================
        // 3. TODAY TASKS (Task Center)
        // ==========================================
        const tasks = await prisma.task.findMany({
            where: {
                assignedTo: userId,
                // Assuming existing task logic checks dueDate or target date.
                // Will fetch non-completed tasks or tasks updated today
                status: { not: 'COMPLETED' }
            },
            take: 10,
            orderBy: { createdAt: 'desc' }
        });

        res.status(200).json({
            overall: {
                assigned: totalAssigned,
                enrolled: totalEnrolled,
                pending: totalPending,
                covered: totalCovered,
                callAnswers: callAnswerCount,
                conversionRate: parseFloat(conversionRate),
                responseRate: parseFloat(responseRate)
            },
            today: {
                msgsSent,
                msgsReceived,
                uniqueNumbers: uniqueNumbers.size,
                covers: todayCovers
            },
            tasks
        });
    } catch (error) {
        console.error("Error fetching V2 Stats:", error);
        res.status(500).json({ error: "Failed to load dashboard metrics." });
    }
};

exports.getCoordinatorDailyLogs = async (req, res) => {
    try {
        const userId = parseInt(req.user?.userId || req.user?.id || req.query.loggedUserId);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        const logs = await prisma.coordinatorDailyLog.findMany({
            where: {
                coordinatorId: userId,
                date: { gte: startOfMonth }
            }
        });

        const todayLog = logs.find(l => new Date(l.date).getTime() === today.getTime());
        
        const monthlyTotal = logs.reduce((acc, curr) => {
            acc.newInqCalls += curr.newInqCalls;
            acc.generalInqCalls += curr.generalInqCalls;
            return acc;
        }, { newInqCalls: 0, generalInqCalls: 0 });

        res.status(200).json({
            today: todayLog || { newInqCalls: 0, generalInqCalls: 0 },
            monthlyTotal
        });

    } catch (error) {
        console.error("Error fetching daily logs:", error);
        res.status(500).json({ error: "Failed to fetch logs" });
    }
};

exports.saveCoordinatorDailyLog = async (req, res) => {
    try {
        const userId = parseInt(req.user?.userId || req.user?.id);
        const { newInqCalls, generalInqCalls } = req.body;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upsertedLog = await prisma.coordinatorDailyLog.upsert({
            where: {
                coordinatorId_date: {
                    coordinatorId: userId,
                    date: today
                }
            },
            update: {
                newInqCalls: parseInt(newInqCalls) || 0,
                generalInqCalls: parseInt(generalInqCalls) || 0
            },
            create: {
                coordinatorId: userId,
                date: today,
                newInqCalls: parseInt(newInqCalls) || 0,
                generalInqCalls: parseInt(generalInqCalls) || 0
            }
        });

        res.status(200).json(upsertedLog);
    } catch (error) {
        console.error("Error saving daily log:", error);
        res.status(500).json({ error: "Failed to save logs" });
    }
};

// ==========================================================================
// 🔥 GET /coordinator-crm/v2-today  — coordinator overview "today" + charts
// Everything here is for the LOGGED-IN user only (req.user). Days are Sri Lanka days (UTC+05:30).
//   classes  : today's timetable rows for the coordinator's batches
//   tasks    : open tasks assigned to me + tasks I completed today
//   calls    : my call-status updates today (Call Campaign audit log), by outcome and by campaign
//   last7    : my call-status updates per day for the last 7 days, by campaign
// ==========================================================================
const LK_OFFSET_MS = 330 * 60 * 1000;
const lkDayStart = (d = new Date()) => {
    const lk = new Date(d.getTime() + LK_OFFSET_MS);
    return new Date(Date.UTC(lk.getUTCFullYear(), lk.getUTCMonth(), lk.getUTCDate()) - LK_OFFSET_MS);
};
const lkDateKey = (d) => new Date(new Date(d).getTime() + LK_OFFSET_MS).toISOString().slice(0, 10);
const validParam = (v) => v !== undefined && v !== null && v !== '' && v !== 'ALL' && v !== 'undefined' && v !== 'null';

const outcomeOf = (status) => {
    const s = String(status || '').toLowerCase();
    if (!s || s === 'pending') return null; // resets are not calls
    if (['answer', 'answered', 'connected'].includes(s)) return 'answered';
    if (['no_answer', 'not_connected', 'switch_off', 'switched_off', 'busy'].includes(s)) return 'noAnswer';
    if (['reject', 'rejected'].includes(s)) return 'reject';
    return 'other';
};
const campaignOf = (cat) => {
    const c = String(cat || '').toUpperCase();
    if (c === 'OPEN_SEMINAR' || c === 'OPEN_SEM') return 'openSem';
    if (c === 'NEW_INQ') return 'newInq';
    if (c === 'PAID' || c === 'PAID_CAMPAIGN') return 'paid';
    return 'other';
};
const parseIdList = (raw) => {
    if (!raw) return [];
    try {
        const v = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return (Array.isArray(v) ? v : [v]).map(x => parseInt(x)).filter(n => !isNaN(n));
    } catch (e) {
        return String(raw).split(',').map(x => parseInt(x)).filter(n => !isNaN(n));
    }
};

exports.getCoordinatorToday = async (req, res) => {
    try {
        const userId = parseInt(req.user?.userId || req.user?.id);
        if (!userId || isNaN(userId)) return res.status(401).json({ error: 'Unauthorized' });

        const { businessId, batchId } = req.query;
        const bizId = validParam(businessId) ? parseInt(businessId) : null;
        const batId = validParam(batchId) ? parseInt(batchId) : null;

        const now = new Date();
        const todayStart = lkDayStart(now);
        const tomorrowStart = new Date(todayStart.getTime() + 24 * 3600 * 1000);
        const weekStart = new Date(todayStart.getTime() - 6 * 24 * 3600 * 1000);

        // ---------- 1. Classes ----------
        // My batches = the selected batch, else batches where I have assigned leads (main or extra batch rows).
        let myBatchIds;
        if (batId) {
            myBatchIds = [batId];
        } else {
            const [leadBatches, extraBatches] = await Promise.all([
                prisma.lead.findMany({ where: { assignedTo: userId, batchId: { not: null } }, select: { batchId: true }, distinct: ['batchId'] }),
                prisma.leadBatchAssignment.findMany({ where: { assignedTo: userId }, select: { batchId: true }, distinct: ['batchId'] })
            ]);
            myBatchIds = [...new Set([...leadBatches.map(l => l.batchId), ...extraBatches.map(a => a.batchId)])];
            if (bizId && myBatchIds.length) {
                const inBiz = await prisma.batch.findMany({ where: { id: { in: myBatchIds }, businessId: bizId }, select: { id: true } });
                myBatchIds = inBiz.map(b => b.id);
            }
        }
        const myBatchSet = new Set(myBatchIds);

        let classes = [];
        if (myBatchSet.size) {
            const todays = await prisma.timetable.findMany({
                where: { date: { gte: todayStart, lt: tomorrowStart }, ...(bizId ? { businessId: bizId } : {}) },
                include: { batch: { select: { id: true, name: true } }, hall: { select: { name: true } } },
                orderBy: { startTime: 'asc' }
            });
            classes = todays
                .filter(t => myBatchSet.has(t.batchId) || parseIdList(t.additionalBatchIds).some(id => myBatchSet.has(id)))
                .map(t => ({
                    id: t.id,
                    subjectName: t.subjectName,
                    title: t.title,
                    startTime: t.startTime,
                    endTime: t.endTime,
                    lecturerName: t.lecturerName,
                    batchName: t.batch?.name || null,
                    hallName: t.hall?.name || null,
                    deliveryStatus: t.deliveryStatus,
                    hasLiveLink: !!t.liveLink
                }));
        }

        // ---------- 2. Tasks ----------
        const taskRows = await prisma.task.findMany({
            where: {
                assignedTo: userId,
                OR: [
                    { status: { not: 'COMPLETED' } },
                    { completedAt: { gte: todayStart } }
                ]
            },
            include: { timetable: { select: { subjectName: true, title: true, startTime: true } } },
            orderBy: [{ deadline: 'asc' }, { createdAt: 'desc' }],
            take: 50
        });
        const TASK_LABEL = { LIVE_LINK: 'Live link', NOTES: 'Notes', RECORDING: 'Recording', PAPER: 'Paper' };
        const tasks = taskRows.map(t => {
            const done = t.status === 'COMPLETED';
            const overdue = !done && t.deadline && new Date(t.deadline) < now;
            const dueToday = !done && t.deadline && new Date(t.deadline) >= todayStart && new Date(t.deadline) < tomorrowStart;
            const base = t.customTitle || [TASK_LABEL[t.taskType] || t.taskType, t.timetable?.subjectName].filter(Boolean).join(' · ');
            return { id: t.id, title: base || 'Task', status: t.status, done, overdue: !!overdue, dueToday: !!dueToday, deadline: t.deadline, completedAt: t.completedAt };
        });
        const taskSummary = {
            total: tasks.length,
            done: tasks.filter(t => t.done).length,
            overdue: tasks.filter(t => t.overdue).length,
            dueToday: tasks.filter(t => t.dueToday).length
        };

        // ---------- 3 + 4. Calls (my status updates) ----------
        const leadScope = bizId ? {
            lead: {
                OR: [
                    { batch: { businessId: bizId } },
                    { phone: { endsWith: `_BIZ_${bizId}` } },
                    { phone: { contains: `_BIZ_${bizId}_` } }
                ]
            }
        } : {};
        const logs = await prisma.callCampaignAuditLog.findMany({
            where: { actionedById: userId, actionType: 'STATUS_UPDATED', createdAt: { gte: weekStart, lt: tomorrowStart }, ...leadScope },
            select: { newStatus: true, campaignCategory: true, createdAt: true }
        });

        const todayCalls = { total: 0, byOutcome: { answered: 0, noAnswer: 0, reject: 0, other: 0 }, byCampaign: { openSem: 0, newInq: 0, paid: 0, other: 0 } };
        const dayMap = {};
        for (let i = 0; i < 7; i++) {
            const key = lkDateKey(new Date(weekStart.getTime() + i * 24 * 3600 * 1000));
            dayMap[key] = { date: key, openSem: 0, newInq: 0, paid: 0, other: 0, total: 0 };
        }
        const todayKey = lkDateKey(now);
        logs.forEach(l => {
            const outcome = outcomeOf(l.newStatus);
            if (!outcome) return;
            const camp = campaignOf(l.campaignCategory);
            const key = lkDateKey(l.createdAt);
            if (dayMap[key]) { dayMap[key][camp]++; dayMap[key].total++; }
            if (key === todayKey) {
                todayCalls.total++;
                todayCalls.byOutcome[outcome]++;
                todayCalls.byCampaign[camp]++;
            }
        });

        res.json({
            generatedAt: now,
            classes,
            tasks,
            taskSummary,
            calls: todayCalls,
            last7: Object.values(dayMap)
        });
    } catch (error) {
        console.error('Coordinator today error:', error);
        res.status(500).json({ error: 'Failed to load today data' });
    }
};
