const prisma = require('../src/core/db');
const {
  buildStatsWhereClause,
  getActiveStaffIds,
  getVerifiedPhones,
  getPrimaryEnrolledLeadIds,
  resolveTargetBizName,
  isStaffInBusiness,
  buildMultiBatchGuard,
  getLast9Digits
} = require('./afterSeminarManagerStatsController');

// Config: paid overdue day of month (null = no overdue rule for now)
const PAID_OVERDUE_DAY_OF_MONTH = null;

// 60-second in-memory cache keyed by businessId|batchId
const cache = new Map();
const CACHE_TTL_MS = 60 * 1000;

const getColomboTime = () => {
  const now = new Date();
  const colomboNow = new Date(now.getTime() + (330 * 60 * 1000));
  const year = colomboNow.getUTCFullYear();
  const month = colomboNow.getUTCMonth();
  const date = colomboNow.getUTCDate();

  const startOfTodayUtc = new Date(Date.UTC(year, month, date, 0, 0, 0, 0) - (330 * 60 * 1000));
  const endOfTodayUtc = new Date(Date.UTC(year, month, date, 23, 59, 59, 999) - (330 * 60 * 1000));
  const todayYMD = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;

  return { startOfTodayUtc, endOfTodayUtc, todayYMD, nowUtc: now };
};

const cleanPhoneDisplay = (phone) => {
  if (!phone) return '';
  return String(phone).split('_')[0].trim();
};

/**
 * GET /api/admin/manager/call-workload?businessId=&batchId=
 */
exports.getCallWorkload = async (req, res) => {
  try {
    const { businessId, batchId, refresh } = req.query;
    const cacheKey = `${businessId || 'ALL'}|${batchId || 'ALL'}`;

    if (refresh !== '1' && cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return res.status(200).json(cached.data);
      }
    }

    const { startOfTodayUtc, endOfTodayUtc, todayYMD, nowUtc } = getColomboTime();

    const targetBizName = await resolveTargetBizName(businessId, batchId);
    const verifiedPhones = await getVerifiedPhones(businessId, batchId);
    const primaryEnrolledLeadIds = await getPrimaryEnrolledLeadIds(businessId, batchId, verifiedPhones);
    const activeStaffIds = await getActiveStaffIds(businessId, batchId);

    const activeStaffUsers = await prisma.user.findMany({
      where: { id: { in: Array.from(activeStaffIds) } },
      select: { id: true, firstName: true, lastName: true, image: true, appChatDp: true, businessType: true, role: true }
    });

    const validCoordinators = activeStaffUsers.filter(u => 
      isStaffInBusiness(u, businessId, targetBizName) && 
      !['STUDENT', 'Student', 'USER', 'user'].includes(u.role)
    );

    const coordMap = new Map();
    validCoordinators.forEach(u => {
      coordMap.set(u.id, {
        staffId: u.id,
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || `Staff #${u.id}`,
        image: u.image || u.appChatDp || null,
        due: { OPEN_SEMINAR: 0, NEW_INQ: 0, PAID: 0, MISSED: 0, REMINDERS: 0 },
        overdue: 0,
        doneToday: 0,
        doneByCampaign: { OPEN_SEMINAR: 0, NEW_INQ: 0, PAID: 0, MISSED: 0, REMINDERS: 0 }
      });
    });

    const byCampaign = {
      OPEN_SEMINAR: { due: 0, overdue: 0, doneToday: 0 },
      NEW_INQ: { due: 0, overdue: 0, doneToday: 0 },
      PAID: { due: 0, overdue: null, doneToday: 0 },
      MISSED: { due: 0, overdue: 0, doneToday: 0 },
      REMINDERS: { due: 0, overdue: 0, doneToday: 0 }
    };

    // 1. OPEN_SEMINAR
    const whereOS = buildStatsWhereClause(businessId, batchId, null, null, {
      campaignType: 'AFTER_SEMINAR',
      inquiryType: { in: ['OPEN_SEMINAR', 'NORMAL'] }
    });
    let leadsOS = await prisma.lead.findMany({
      where: whereOS,
      select: {
        id: true, name: true, phone: true, assignedTo: true, openSemCallStatus: true,
        openSemRound: true, assignedAt: true, createdAt: true, source: true
      }
    });
    leadsOS = leadsOS.filter(l => l.source !== 'bridge_transfer' && l.source !== 'system');
    const multiBatchGuardOS = await buildMultiBatchGuard(leadsOS);

    const seenOS = new Set();
    leadsOS.forEach(l => {
      const isPending = l.openSemCallStatus === 'pending' || !l.openSemCallStatus;
      let isEnrolled = primaryEnrolledLeadIds.has(l.id);
      if (multiBatchGuardOS.has(l.id)) isEnrolled = multiBatchGuardOS.primaryPaid(l);

      if (isPending && !isEnrolled && l.assignedTo && coordMap.has(l.assignedTo)) {
        const last9 = getLast9Digits(l.phone);
        if (last9 && seenOS.has(last9)) return;
        if (last9) seenOS.add(last9);

        const coord = coordMap.get(l.assignedTo);
        coord.due.OPEN_SEMINAR++;
        byCampaign.OPEN_SEMINAR.due++;

        const assignedDaysPassed = (nowUtc - new Date(l.assignedAt || l.createdAt)) / (1000 * 60 * 60 * 24);
        const round = l.openSemRound || 1;
        const isDelayed = (assignedDaysPassed >= 14) || (round === 1 && assignedDaysPassed >= 7);
        if (isDelayed) {
          coord.overdue++;
          byCampaign.OPEN_SEMINAR.overdue++;
        }
      }
    });

    // 2. NEW_INQ
    const whereNI = buildStatsWhereClause(businessId, batchId, null, null, {
      campaignType: 'AFTER_SEMINAR',
      inquiryType: 'NEW_INQ'
    });
    let leadsNI = await prisma.lead.findMany({
      where: whereNI,
      select: {
        id: true, name: true, phone: true, assignedTo: true, newInqCallStatus: true,
        newInqRound: true, assignedAt: true, createdAt: true, source: true
      }
    });
    leadsNI = leadsNI.filter(l => l.source !== 'bridge_transfer' && l.source !== 'system');
    const multiBatchGuardNI = await buildMultiBatchGuard(leadsNI);

    const seenNI = new Set();
    leadsNI.forEach(l => {
      const isPending = l.newInqCallStatus === 'pending' || !l.newInqCallStatus;
      let isEnrolled = primaryEnrolledLeadIds.has(l.id);
      if (multiBatchGuardNI.has(l.id)) isEnrolled = multiBatchGuardNI.primaryPaid(l);

      if (isPending && !isEnrolled && l.assignedTo && coordMap.has(l.assignedTo)) {
        const last9 = getLast9Digits(l.phone);
        if (last9 && seenNI.has(last9)) return;
        if (last9) seenNI.add(last9);

        const coord = coordMap.get(l.assignedTo);
        coord.due.NEW_INQ++;
        byCampaign.NEW_INQ.due++;

        const assignedDaysPassed = (nowUtc - new Date(l.assignedAt || l.createdAt)) / (1000 * 60 * 60 * 24);
        const assignedHoursPassed = assignedDaysPassed * 24;
        const round = l.newInqRound || 1;
        const isDelayed = (round === 1 && assignedHoursPassed >= 24) || (round === 2 && assignedDaysPassed >= 7);
        if (isDelayed) {
          coord.overdue++;
          byCampaign.NEW_INQ.overdue++;
        }
      }
    });

    // 3. PAID
    const wherePaid = buildStatsWhereClause(businessId, batchId, null, null, {
      campaignType: 'AFTER_SEMINAR',
      inquiryType: 'PAID_CAMP',
      enrollmentStatus: 'ENROLLED'
    });
    let leadsPaid = await prisma.lead.findMany({
      where: wherePaid,
      select: {
        id: true, name: true, phone: true, assignedTo: true, paidCallStatus: true,
        assignedAt: true, createdAt: true
      }
    });
    const seenPaid = new Set();
    leadsPaid.forEach(l => {
      if (!l.phone) return;
      const clean = l.phone.split('_')[0].replace(/[^0-9]/g, '');
      if (clean.length < 7 || !verifiedPhones.has(clean.slice(-7))) return;

      const isPending = l.paidCallStatus === 'pending' || !l.paidCallStatus;
      if (isPending && l.assignedTo && coordMap.has(l.assignedTo)) {
        const last9 = getLast9Digits(l.phone);
        if (last9 && seenPaid.has(last9)) return;
        if (last9) seenPaid.add(last9);

        const coord = coordMap.get(l.assignedTo);
        coord.due.PAID++;
        byCampaign.PAID.due++;
      }
    });

    // 4. MISSED CALLS (MissedCallTask)
    const missedWhere = {
      taskAssigneeId: { in: Array.from(coordMap.keys()) },
      status: { notIn: ['COMPLETED', 'RESOLVED'] }
    };
    if (businessId && businessId !== 'ALL') missedWhere.businessId = parseInt(businessId);
    if (batchId && batchId !== 'ALL') missedWhere.batchId = parseInt(batchId);

    const missedTasks = await prisma.missedCallTask.findMany({
      where: missedWhere,
      select: { id: true, taskAssigneeId: true, taskDate: true }
    });
    missedTasks.forEach(task => {
      const coord = coordMap.get(task.taskAssigneeId);
      if (coord) {
        coord.due.MISSED++;
        byCampaign.MISSED.due++;
        if (task.taskDate && task.taskDate < todayYMD) {
          coord.overdue++;
          byCampaign.MISSED.overdue++;
        }
      }
    });

    // 5. REMINDERS (Reminder)
    const reminderWhere = {
      agentId: { in: Array.from(coordMap.keys()) },
      isCompleted: false,
      isPersonal: false,
      remindAt: { lte: endOfTodayUtc }
    };
    const reminders = await prisma.reminder.findMany({
      where: reminderWhere,
      select: { id: true, agentId: true, remindAt: true }
    });
    reminders.forEach(r => {
      const coord = coordMap.get(r.agentId);
      if (coord) {
        coord.due.REMINDERS++;
        byCampaign.REMINDERS.due++;
        if (new Date(r.remindAt) < nowUtc) {
          coord.overdue++;
          byCampaign.REMINDERS.overdue++;
        }
      }
    });

    // DONE TODAY: Audit logs
    const auditLogs = await prisma.callCampaignAuditLog.findMany({
      where: {
        actionType: { in: ['STATUS_UPDATED', 'CALL_ATTEMPTED'] },
        createdAt: { gte: startOfTodayUtc },
        actionedById: { in: Array.from(coordMap.keys()) }
      },
      select: { id: true, leadId: true, campaignCategory: true, actionedById: true }
    });
    const coordAuditSets = new Map();
    auditLogs.forEach(log => {
      const rawCat = (log.campaignCategory || '').toUpperCase();
      let cat = 'OPEN_SEMINAR';
      if (rawCat.includes('NEW_INQ')) cat = 'NEW_INQ';
      else if (rawCat.includes('PAID')) cat = 'PAID';
      else if (rawCat.includes('OPEN_SEM')) cat = 'OPEN_SEMINAR';

      const staffId = log.actionedById;
      if (!coordAuditSets.has(staffId)) coordAuditSets.set(staffId, new Set());
      const key = `${log.leadId}:${cat}`;
      if (!coordAuditSets.get(staffId).has(key)) {
        coordAuditSets.get(staffId).add(key);
        const coord = coordMap.get(staffId);
        if (coord) {
          coord.doneToday++;
          coord.doneByCampaign[cat]++;
          byCampaign[cat].doneToday++;
        }
      }
    });

    // DONE TODAY: Missed calls
    const missedDoneWhere = {
      taskAssigneeId: { in: Array.from(coordMap.keys()) },
      lastAttemptAt: { gte: startOfTodayUtc }
    };
    if (businessId && businessId !== 'ALL') missedDoneWhere.businessId = parseInt(businessId);
    if (batchId && batchId !== 'ALL') missedDoneWhere.batchId = parseInt(batchId);
    const missedDone = await prisma.missedCallTask.findMany({
      where: missedDoneWhere,
      select: { id: true, taskAssigneeId: true }
    });
    missedDone.forEach(t => {
      const coord = coordMap.get(t.taskAssigneeId);
      if (coord) {
        coord.doneToday++;
        coord.doneByCampaign.MISSED++;
        byCampaign.MISSED.doneToday++;
      }
    });

    // DONE TODAY: Reminders
    const remindersDone = await prisma.reminder.findMany({
      where: {
        agentId: { in: Array.from(coordMap.keys()) },
        isCompleted: true,
        isPersonal: false,
        updatedAt: { gte: startOfTodayUtc }
      },
      select: { id: true, agentId: true }
    });
    remindersDone.forEach(r => {
      const coord = coordMap.get(r.agentId);
      if (coord) {
        coord.doneToday++;
        coord.doneByCampaign.REMINDERS++;
        byCampaign.REMINDERS.doneToday++;
      }
    });

    const totals = {
      due: byCampaign.OPEN_SEMINAR.due + byCampaign.NEW_INQ.due + byCampaign.PAID.due + byCampaign.MISSED.due + byCampaign.REMINDERS.due,
      doneToday: byCampaign.OPEN_SEMINAR.doneToday + byCampaign.NEW_INQ.doneToday + byCampaign.PAID.doneToday + byCampaign.MISSED.doneToday + byCampaign.REMINDERS.doneToday,
      overdue: byCampaign.OPEN_SEMINAR.overdue + byCampaign.NEW_INQ.overdue + (byCampaign.PAID.overdue || 0) + byCampaign.MISSED.overdue + byCampaign.REMINDERS.overdue,
      missedDue: byCampaign.MISSED.due,
      remindersDue: byCampaign.REMINDERS.due
    };

    const coordinators = Array.from(coordMap.values()).map(c => {
      const totalDue = c.due.OPEN_SEMINAR + c.due.NEW_INQ + c.due.PAID + c.due.MISSED + c.due.REMINDERS;
      const sum = totalDue + c.doneToday;
      const donePct = sum > 0 ? Math.round((c.doneToday / sum) * 1000) / 10 : 0;
      return {
        staffId: c.staffId,
        name: c.name,
        image: c.image,
        due: c.due,
        totalDue,
        overdue: c.overdue,
        doneToday: c.doneToday,
        doneByCampaign: c.doneByCampaign,
        donePct
      };
    }).sort((a, b) => b.totalDue - a.totalDue);

    const result = {
      totals,
      byCampaign,
      coordinators,
      generatedAt: new Date().toISOString()
    };

    cache.set(cacheKey, { timestamp: Date.now(), data: result });
    return res.status(200).json(result);
  } catch (error) {
    console.error('Call Workload Error:', error);
    return res.status(500).json({ error: 'Failed to fetch call workload' });
  }
};

/**
 * GET /api/admin/manager/call-workload/list?businessId=&batchId=&campaign=OPEN_SEMINAR|NEW_INQ|PAID|MISSED|REMINDERS&type=due|overdue|done&staffId=
 */
exports.getCallWorkloadList = async (req, res) => {
  try {
    const { businessId, batchId, campaign, type, staffId } = req.query;
    const { startOfTodayUtc, endOfTodayUtc, todayYMD, nowUtc } = getColomboTime();

    const targetBizName = await resolveTargetBizName(businessId, batchId);
    const verifiedPhones = await getVerifiedPhones(businessId, batchId);
    const primaryEnrolledLeadIds = await getPrimaryEnrolledLeadIds(businessId, batchId, verifiedPhones);
    const activeStaffIds = await getActiveStaffIds(businessId, batchId);

    const activeStaffUsers = await prisma.user.findMany({
      where: { id: { in: Array.from(activeStaffIds) } },
      select: { id: true, firstName: true, lastName: true, image: true, appChatDp: true, businessType: true, role: true }
    });

    const validCoordinators = activeStaffUsers.filter(u => 
      isStaffInBusiness(u, businessId, targetBizName) && 
      !['STUDENT', 'Student', 'USER', 'user'].includes(u.role)
    );

    const coordMap = new Map();
    validCoordinators.forEach(u => {
      coordMap.set(u.id, `${u.firstName || ''} ${u.lastName || ''}`.trim() || `Staff #${u.id}`);
    });

    const targetStaffId = staffId ? parseInt(staffId) : null;
    const isAllowedStaff = (id) => {
      if (!id || !coordMap.has(id)) return false;
      if (targetStaffId) return id === targetStaffId;
      return true;
    };

    const results = [];

    if (campaign === 'OPEN_SEMINAR') {
      if (type === 'done') {
        const logs = await prisma.callCampaignAuditLog.findMany({
          where: {
            actionType: { in: ['STATUS_UPDATED', 'CALL_ATTEMPTED'] },
            createdAt: { gte: startOfTodayUtc },
            actionedById: targetStaffId ? targetStaffId : { in: Array.from(coordMap.keys()) },
            campaignCategory: { in: ['OPEN_SEM', 'OPEN_SEMINAR'] }
          },
          select: {
            id: true, leadId: true, actionedById: true, createdAt: true, newStatus: true,
            lead: { select: { id: true, name: true, phone: true, openSemRound: true } }
          },
          orderBy: { createdAt: 'desc' }
        });
        const seen = new Set();
        for (const log of logs) {
          if (!log.leadId || seen.has(log.leadId)) continue;
          seen.add(log.leadId);
          results.push({
            id: log.leadId,
            leadId: log.leadId,
            name: log.lead?.name || `Lead #${log.leadId}`,
            phone: cleanPhoneDisplay(log.lead?.phone),
            coordinator: coordMap.get(log.actionedById) || `Staff #${log.actionedById}`,
            round: log.lead?.openSemRound || 1,
            status: log.newStatus || 'contacted',
            date: log.createdAt
          });
          if (results.length >= 500) break;
        }
      } else {
        const whereOS = buildStatsWhereClause(businessId, batchId, null, null, {
          campaignType: 'AFTER_SEMINAR',
          inquiryType: { in: ['OPEN_SEMINAR', 'NORMAL'] }
        });
        let leads = await prisma.lead.findMany({
          where: whereOS,
          select: {
            id: true, name: true, phone: true, assignedTo: true, openSemCallStatus: true,
            openSemRound: true, assignedAt: true, createdAt: true, source: true
          },
          orderBy: { id: 'desc' }
        });
        leads = leads.filter(l => l.source !== 'bridge_transfer' && l.source !== 'system');
        const multiBatchGuard = await buildMultiBatchGuard(leads);

        const seen = new Set();
        for (const l of leads) {
          const isPending = l.openSemCallStatus === 'pending' || !l.openSemCallStatus;
          let isEnrolled = primaryEnrolledLeadIds.has(l.id);
          if (multiBatchGuard.has(l.id)) isEnrolled = multiBatchGuard.primaryPaid(l);

          if (isPending && !isEnrolled && isAllowedStaff(l.assignedTo)) {
            const last9 = getLast9Digits(l.phone);
            if (last9 && seen.has(last9)) continue;
            if (last9) seen.add(last9);

            const assignedDaysPassed = (nowUtc - new Date(l.assignedAt || l.createdAt)) / (1000 * 60 * 60 * 24);
            const round = l.openSemRound || 1;
            const isDelayed = (assignedDaysPassed >= 14) || (round === 1 && assignedDaysPassed >= 7);

            if (type === 'overdue' && !isDelayed) continue;

            results.push({
              id: l.id,
              leadId: l.id,
              name: l.name || `Lead #${l.id}`,
              phone: cleanPhoneDisplay(l.phone),
              coordinator: coordMap.get(l.assignedTo),
              round: l.openSemRound || 1,
              status: l.openSemCallStatus || 'pending',
              date: l.assignedAt || l.createdAt,
              isOverdue: isDelayed
            });
            if (results.length >= 500) break;
          }
        }
      }
    } else if (campaign === 'NEW_INQ') {
      if (type === 'done') {
        const logs = await prisma.callCampaignAuditLog.findMany({
          where: {
            actionType: { in: ['STATUS_UPDATED', 'CALL_ATTEMPTED'] },
            createdAt: { gte: startOfTodayUtc },
            actionedById: targetStaffId ? targetStaffId : { in: Array.from(coordMap.keys()) },
            campaignCategory: 'NEW_INQ'
          },
          select: {
            id: true, leadId: true, actionedById: true, createdAt: true, newStatus: true,
            lead: { select: { id: true, name: true, phone: true, newInqRound: true } }
          },
          orderBy: { createdAt: 'desc' }
        });
        const seen = new Set();
        for (const log of logs) {
          if (!log.leadId || seen.has(log.leadId)) continue;
          seen.add(log.leadId);
          results.push({
            id: log.leadId,
            leadId: log.leadId,
            name: log.lead?.name || `Lead #${log.leadId}`,
            phone: cleanPhoneDisplay(log.lead?.phone),
            coordinator: coordMap.get(log.actionedById) || `Staff #${log.actionedById}`,
            round: log.lead?.newInqRound || 1,
            status: log.newStatus || 'contacted',
            date: log.createdAt
          });
          if (results.length >= 500) break;
        }
      } else {
        const whereNI = buildStatsWhereClause(businessId, batchId, null, null, {
          campaignType: 'AFTER_SEMINAR',
          inquiryType: 'NEW_INQ'
        });
        let leads = await prisma.lead.findMany({
          where: whereNI,
          select: {
            id: true, name: true, phone: true, assignedTo: true, newInqCallStatus: true,
            newInqRound: true, assignedAt: true, createdAt: true, source: true
          },
          orderBy: { id: 'desc' }
        });
        leads = leads.filter(l => l.source !== 'bridge_transfer' && l.source !== 'system');
        const multiBatchGuard = await buildMultiBatchGuard(leads);

        const seen = new Set();
        for (const l of leads) {
          const isPending = l.newInqCallStatus === 'pending' || !l.newInqCallStatus;
          let isEnrolled = primaryEnrolledLeadIds.has(l.id);
          if (multiBatchGuard.has(l.id)) isEnrolled = multiBatchGuard.primaryPaid(l);

          if (isPending && !isEnrolled && isAllowedStaff(l.assignedTo)) {
            const last9 = getLast9Digits(l.phone);
            if (last9 && seen.has(last9)) continue;
            if (last9) seen.add(last9);

            const assignedDaysPassed = (nowUtc - new Date(l.assignedAt || l.createdAt)) / (1000 * 60 * 60 * 24);
            const assignedHoursPassed = assignedDaysPassed * 24;
            const round = l.newInqRound || 1;
            const isDelayed = (round === 1 && assignedHoursPassed >= 24) || (round === 2 && assignedDaysPassed >= 7);

            if (type === 'overdue' && !isDelayed) continue;

            results.push({
              id: l.id,
              leadId: l.id,
              name: l.name || `Lead #${l.id}`,
              phone: cleanPhoneDisplay(l.phone),
              coordinator: coordMap.get(l.assignedTo),
              round: l.newInqRound || 1,
              status: l.newInqCallStatus || 'pending',
              date: l.assignedAt || l.createdAt,
              isOverdue: isDelayed
            });
            if (results.length >= 500) break;
          }
        }
      }
    } else if (campaign === 'PAID') {
      if (type === 'done') {
        const logs = await prisma.callCampaignAuditLog.findMany({
          where: {
            actionType: { in: ['STATUS_UPDATED', 'CALL_ATTEMPTED'] },
            createdAt: { gte: startOfTodayUtc },
            actionedById: targetStaffId ? targetStaffId : { in: Array.from(coordMap.keys()) },
            campaignCategory: { in: ['PAID', 'PAID_CAMPAIGN'] }
          },
          select: {
            id: true, leadId: true, actionedById: true, createdAt: true, newStatus: true,
            lead: { select: { id: true, name: true, phone: true } }
          },
          orderBy: { createdAt: 'desc' }
        });
        const seen = new Set();
        for (const log of logs) {
          if (!log.leadId || seen.has(log.leadId)) continue;
          seen.add(log.leadId);
          results.push({
            id: log.leadId,
            leadId: log.leadId,
            name: log.lead?.name || `Paid Student #${log.leadId}`,
            phone: cleanPhoneDisplay(log.lead?.phone),
            coordinator: coordMap.get(log.actionedById) || `Staff #${log.actionedById}`,
            round: 1,
            status: log.newStatus || 'contacted',
            date: log.createdAt
          });
          if (results.length >= 500) break;
        }
      } else if (type === 'due') {
        const wherePaid = buildStatsWhereClause(businessId, batchId, null, null, {
          campaignType: 'AFTER_SEMINAR',
          inquiryType: 'PAID_CAMP',
          enrollmentStatus: 'ENROLLED'
        });
        const leads = await prisma.lead.findMany({
          where: wherePaid,
          select: { id: true, name: true, phone: true, assignedTo: true, paidCallStatus: true, assignedAt: true, createdAt: true },
          orderBy: { id: 'desc' }
        });
        const seen = new Set();
        for (const l of leads) {
          if (!l.phone) continue;
          const clean = l.phone.split('_')[0].replace(/[^0-9]/g, '');
          if (clean.length < 7 || !verifiedPhones.has(clean.slice(-7))) continue;

          const isPending = l.paidCallStatus === 'pending' || !l.paidCallStatus;
          if (isPending && isAllowedStaff(l.assignedTo)) {
            const last9 = getLast9Digits(l.phone);
            if (last9 && seen.has(last9)) continue;
            if (last9) seen.add(last9);

            results.push({
              id: l.id,
              leadId: l.id,
              name: l.name || `Paid Student #${l.id}`,
              phone: cleanPhoneDisplay(l.phone),
              coordinator: coordMap.get(l.assignedTo),
              round: 1,
              status: l.paidCallStatus || 'pending',
              date: l.assignedAt || l.createdAt
            });
            if (results.length >= 500) break;
          }
        }
      }
    } else if (campaign === 'MISSED') {
      if (type === 'done') {
        const missedDoneWhere = {
          taskAssigneeId: targetStaffId ? targetStaffId : { in: Array.from(coordMap.keys()) },
          lastAttemptAt: { gte: startOfTodayUtc }
        };
        if (businessId && businessId !== 'ALL') missedDoneWhere.businessId = parseInt(businessId);
        if (batchId && batchId !== 'ALL') missedDoneWhere.batchId = parseInt(batchId);
        const tasks = await prisma.missedCallTask.findMany({
          where: missedDoneWhere,
          select: { id: true, studentName: true, phone: true, taskAssigneeId: true, callAttempts: true, status: true, lastAttemptAt: true },
          orderBy: { lastAttemptAt: 'desc' },
          take: 500
        });
        tasks.forEach(t => {
          results.push({
            id: t.id,
            taskId: t.id,
            name: t.studentName || 'Student',
            phone: cleanPhoneDisplay(t.phone),
            coordinator: coordMap.get(t.taskAssigneeId),
            round: t.callAttempts || 0,
            status: t.status,
            date: t.lastAttemptAt
          });
        });
      } else {
        const missedWhere = {
          taskAssigneeId: targetStaffId ? targetStaffId : { in: Array.from(coordMap.keys()) },
          status: { notIn: ['COMPLETED', 'RESOLVED'] }
        };
        if (businessId && businessId !== 'ALL') missedWhere.businessId = parseInt(businessId);
        if (batchId && batchId !== 'ALL') missedWhere.batchId = parseInt(batchId);
        if (type === 'overdue') {
          missedWhere.taskDate = { lt: todayYMD };
        }
        const tasks = await prisma.missedCallTask.findMany({
          where: missedWhere,
          select: { id: true, studentName: true, phone: true, taskAssigneeId: true, callAttempts: true, status: true, taskDate: true, createdAt: true },
          orderBy: { id: 'desc' },
          take: 500
        });
        tasks.forEach(t => {
          results.push({
            id: t.id,
            taskId: t.id,
            name: t.studentName || 'Student',
            phone: cleanPhoneDisplay(t.phone),
            coordinator: coordMap.get(t.taskAssigneeId),
            round: t.callAttempts || 0,
            status: t.status,
            date: t.taskDate || t.createdAt
          });
        });
      }
    } else if (campaign === 'REMINDERS') {
      if (type === 'done') {
        const reminders = await prisma.reminder.findMany({
          where: {
            agentId: targetStaffId ? targetStaffId : { in: Array.from(coordMap.keys()) },
            isCompleted: true,
            isPersonal: false,
            updatedAt: { gte: startOfTodayUtc }
          },
          select: { id: true, name: true, phone: true, agentId: true, round: true, note: true, updatedAt: true },
          orderBy: { updatedAt: 'desc' },
          take: 500
        });
        reminders.forEach(r => {
          results.push({
            id: r.id,
            taskId: r.id,
            name: r.name || 'Student',
            phone: cleanPhoneDisplay(r.phone),
            coordinator: coordMap.get(r.agentId),
            round: r.round || 1,
            status: r.note || 'Completed',
            date: r.updatedAt
          });
        });
      } else {
        const remWhere = {
          agentId: targetStaffId ? targetStaffId : { in: Array.from(coordMap.keys()) },
          isCompleted: false,
          isPersonal: false,
          remindAt: { lte: endOfTodayUtc }
        };
        if (type === 'overdue') {
          remWhere.remindAt = { lt: nowUtc };
        }
        const reminders = await prisma.reminder.findMany({
          where: remWhere,
          select: { id: true, name: true, phone: true, agentId: true, round: true, note: true, remindAt: true },
          orderBy: { remindAt: 'asc' },
          take: 500
        });
        reminders.forEach(r => {
          results.push({
            id: r.id,
            taskId: r.id,
            name: r.name || 'Student',
            phone: cleanPhoneDisplay(r.phone),
            coordinator: coordMap.get(r.agentId),
            round: r.round || 1,
            status: r.note || 'Pending',
            date: r.remindAt
          });
        });
      }
    }

    return res.status(200).json(results);
  } catch (error) {
    console.error('Call Workload List Error:', error);
    return res.status(500).json({ error: 'Failed to fetch call workload list' });
  }
};
