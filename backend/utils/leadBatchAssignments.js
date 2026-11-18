// 🔥 MULTI-BATCH ALLOCATION HELPERS 🔥
// A chat room (Lead) keeps ONE primary batch in Lead.batchId / Lead.assignedTo (all existing flows
// keep working on it). Extra batches of the same student live in LeadBatchAssignment, each with its
// own coordinator, unread counter and Paid-campaign call data.
const prisma = require('../lib/prisma');

const phone7 = (raw) => {
    const d = String(raw || '').split('_')[0].replace(/[^0-9]/g, '');
    return d.length >= 7 ? d.slice(-7) : null;
};

// Set of `${batchId}_${last7}` for approved payments (status 1 = approved, 4 = approved/processing as used in stats)
const getApprovedBatchPhoneSet = async ({ businessId, batchIds } = {}) => {
    const where = { status: { in: [1, 4] }, batchId: { not: null } };
    if (Array.isArray(batchIds) && batchIds.length > 0) where.batchId = { in: batchIds.map(Number) };
    else if (businessId && businessId !== 'ALL' && !isNaN(parseInt(businessId))) where.businessId = parseInt(businessId);

    const payments = await prisma.payment.findMany({
        where,
        select: { batchId: true, student: { select: { phone: true, whatsapp: true, optionalPhone: true } } }
    });
    const set = new Set();
    payments.forEach(p => {
        if (!p.student) return;
        [p.student.phone, p.student.whatsapp, p.student.optionalPhone].forEach(ph => {
            const s = phone7(ph);
            if (s) set.add(`${p.batchId}_${s}`);
        });
    });
    return set;
};

const isPaidForBatch = (paidSet, leadPhone, batchId) => {
    const s = phone7(leadPhone);
    return Boolean(s && batchId && paidSet.has(`${batchId}_${s}`));
};

// The chat room of a student in a business: latest-messaged AFTER_SEMINAR lead (not system/_PAID) with a batch.
const findChatLeadForStudent = async (last7s, businessId) => {
    if (!last7s || last7s.length === 0) return { chatLead: null, allLeads: [] };
    const leads = await prisma.lead.findMany({
        where: {
            campaignType: 'AFTER_SEMINAR',
            source: { not: 'system' },
            OR: last7s.map(l7 => ({ phone: { contains: l7 } }))
        },
        select: { id: true, phone: true, batchId: true, assignedTo: true, lastMessageAt: true, updatedAt: true, batch: { select: { businessId: true } } }
    });
    const inBiz = leads.filter(l => {
        if (!businessId) return true;
        if (l.batch?.businessId) return String(l.batch.businessId) === String(businessId);
        return new RegExp(`_BIZ_${businessId}(_|$)`).test(l.phone || '');
    });
    const withBatch = inBiz.filter(l => l.batchId);
    withBatch.sort((a, b) => new Date(b.lastMessageAt || b.updatedAt || 0) - new Date(a.lastMessageAt || a.updatedAt || 0));
    return { chatLead: withBatch[0] || null, allLeads: inBiz };
};

// Called after a payment is APPROVED: if the student's chat room is in another batch of the same
// business, add this batch as an extra batch, UNASSIGNED (a manager picks the coordinator).
const ensureExtraBatchForPayment = async (payment, last7s) => {
    if (!payment || parseInt(payment.status) !== 1 || !payment.batchId) return null;
    const batchId = parseInt(payment.batchId);
    let businessId = payment.businessId;
    if (!businessId) {
        const b = await prisma.batch.findUnique({ where: { id: batchId }, select: { businessId: true } });
        businessId = b?.businessId;
    }
    const { chatLead, allLeads } = await findChatLeadForStudent(last7s, businessId);
    if (!chatLead) return null;
    if (chatLead.batchId === batchId) return null;
    // A separate chat room already exists for this batch -> nothing to do
    if (allLeads.some(l => l.batchId === batchId)) return null;

    return prisma.leadBatchAssignment.upsert({
        where: { leadId_batchId: { leadId: chatLead.id, batchId } },
        update: {},
        create: { leadId: chatLead.id, batchId, assignedTo: null, source: 'PAYMENT_AUTO' }
    });
};

// Inbound message: every EXTRA coordinator (who is not the primary coordinator) gets +1 unread.
const incrementExtraUnread = async (leadId) => {
    if (!leadId) return;
    const lead = await prisma.lead.findUnique({ where: { id: parseInt(leadId) }, select: { assignedTo: true, batchId: true } });
    if (!lead) return;
    const where = { leadId: parseInt(leadId), assignedTo: { not: null } };
    if (lead.assignedTo) where.NOT = { assignedTo: lead.assignedTo };
    if (lead.batchId) where.batchId = { not: lead.batchId };
    await prisma.leadBatchAssignment.updateMany({ where, data: { unreadCount: { increment: 1 } } });
};

// Opening a chat. Returns true if the PRIMARY unread (Lead.unreadCount) should be cleared.
// An extra-batch coordinator only clears their own counter, so the primary coordinator still sees "unread".
const markReadForViewer = async (leadId, viewerId) => {
    const id = parseInt(leadId);
    const viewer = viewerId ? parseInt(viewerId) : null;
    const lead = await prisma.lead.findUnique({ where: { id }, select: { assignedTo: true, batchId: true } });
    if (!lead) return false;
    let clearPrimary = true;
    if (viewer) {
        const myRows = await prisma.leadBatchAssignment.findMany({
            where: { leadId: id, assignedTo: viewer },
            select: { id: true, batchId: true }
        });
        if (myRows.length > 0) {
            await prisma.leadBatchAssignment.updateMany({ where: { leadId: id, assignedTo: viewer }, data: { unreadCount: 0 } });
            const isPrimaryCoordinator = lead.assignedTo === viewer;
            if (!isPrimaryCoordinator && lead.assignedTo) clearPrimary = false;
        }
    }
    return clearPrimary;
};

// Lead moved to a new primary batch (e.g. WhatsApp from another batch's number):
// keep the OLD batch as an extra batch with the same coordinator if the student was enrolled there.
const preserveOldBatchOnMove = async (lead, newBatchId) => {
    if (!lead || !lead.batchId || !newBatchId || lead.batchId === parseInt(newBatchId)) return;
    if (!(lead.enrollmentStatus === 'ENROLLED' || lead.enrollmentStatus === 'PAID')) return;
    await prisma.leadBatchAssignment.upsert({
        where: { leadId_batchId: { leadId: lead.id, batchId: lead.batchId } },
        update: {},
        create: { leadId: lead.id, batchId: lead.batchId, assignedTo: lead.assignedTo || null, source: 'BATCH_MOVE' }
    });
};

// Extra-batch rows for many leads, ignoring rows that point at the lead's current primary batch.
const getExtraRowsForLeads = async (leads) => {
    const ids = (leads || []).map(l => l.id).filter(Boolean);
    if (ids.length === 0) return new Map();
    const rows = await prisma.leadBatchAssignment.findMany({
        where: { leadId: { in: ids } },
        include: {
            batch: { select: { id: true, name: true } },
            assignedUser: { select: { id: true, firstName: true, lastName: true } }
        }
    });
    const primaryBatch = new Map((leads || []).map(l => [l.id, l.batchId]));
    const map = new Map();
    rows.forEach(r => {
        if (primaryBatch.get(r.leadId) === r.batchId) return;
        if (!map.has(r.leadId)) map.set(r.leadId, []);
        map.get(r.leadId).push(r);
    });
    return map;
};

// One-time backfill: approved payments in a batch that is not the chat room's batch -> UNASSIGNED extra batch.
const backfillExtraBatches = async ({ businessId = null, dryRun = true } = {}) => {
    const payWhere = { status: 1, batchId: { not: null } };
    if (businessId) payWhere.businessId = parseInt(businessId);
    const payments = await prisma.payment.findMany({
        where: payWhere,
        select: { batchId: true, businessId: true, studentId: true, student: { select: { phone: true, whatsapp: true, optionalPhone: true } } }
    });

    const leads = await prisma.lead.findMany({
        where: { campaignType: 'AFTER_SEMINAR', source: { not: 'system' }, batchId: { not: null } },
        select: { id: true, phone: true, batchId: true, lastMessageAt: true, updatedAt: true, batch: { select: { businessId: true } } }
    });
    const byPhone = new Map();
    leads.forEach(l => {
        const s = phone7(l.phone);
        if (!s) return;
        if (!byPhone.has(s)) byPhone.set(s, []);
        byPhone.get(s).push(l);
    });

    const existing = await prisma.leadBatchAssignment.findMany({ select: { leadId: true, batchId: true } });
    const existingKeys = new Set(existing.map(e => `${e.leadId}_${e.batchId}`));
    const toCreate = new Map();

    payments.forEach(p => {
        if (!p.student) return;
        const suffixes = [...new Set([p.student.phone, p.student.whatsapp, p.student.optionalPhone].map(phone7).filter(Boolean))];
        let candidates = [];
        suffixes.forEach(s => { candidates = candidates.concat(byPhone.get(s) || []); });
        const bizId = p.businessId;
        candidates = candidates.filter(l => !bizId || !l.batch?.businessId || String(l.batch.businessId) === String(bizId));
        if (candidates.length === 0) return;
        if (candidates.some(l => l.batchId === p.batchId)) return;
        candidates.sort((a, b) => new Date(b.lastMessageAt || b.updatedAt || 0) - new Date(a.lastMessageAt || a.updatedAt || 0));
        const chat = candidates[0];
        const key = `${chat.id}_${p.batchId}`;
        if (existingKeys.has(key) || toCreate.has(key)) return;
        toCreate.set(key, { leadId: chat.id, batchId: p.batchId, assignedTo: null, source: 'BACKFILL' });
    });

    const data = Array.from(toCreate.values());
    if (!dryRun && data.length > 0) {
        await prisma.leadBatchAssignment.createMany({ data, skipDuplicates: true });
    }
    return { found: data.length, created: dryRun ? 0 : data.length, sample: data.slice(0, 20) };
};

module.exports = {
    phone7,
    getApprovedBatchPhoneSet,
    isPaidForBatch,
    ensureExtraBatchForPayment,
    incrementExtraUnread,
    markReadForViewer,
    preserveOldBatchOnMove,
    getExtraRowsForLeads,
    backfillExtraBatches
};
