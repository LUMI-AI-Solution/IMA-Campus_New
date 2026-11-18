// 🔥 MULTI-BATCH ALLOCATION API 🔥
// One chat room, many batches. Primary batch = Lead.batchId / Lead.assignedTo (unchanged).
// Extra batches = LeadBatchAssignment rows (each with its own coordinator).
const prisma = require('../lib/prisma');
const { getApprovedBatchPhoneSet, isPaidForBatch, backfillExtraBatches } = require('../utils/leadBatchAssignments');

const MANAGER_ROLES = ['SYSTEM_ADMIN', 'DIRECTOR', 'MANAGER', 'SUPER', 'ASS_MANAGER', 'ADMIN_MANAGER', 'SUPER_ADMIN', 'SUPERADMIN', 'ADMIN'];
const isManagerReq = (req) => MANAGER_ROLES.includes(String(req.user?.role || '').toUpperCase().replace(/ /g, '_'));
const fullName = (u) => (u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : null);

// GET /after-seminar-crm/leads/:leadId/batches
exports.getLeadBatches = async (req, res) => {
    try {
        const leadId = parseInt(req.params.leadId);
        if (isNaN(leadId)) return res.status(400).json({ error: 'Invalid lead ID' });

        const lead = await prisma.lead.findUnique({
            where: { id: leadId },
            select: {
                id: true, phone: true, batchId: true, assignedTo: true, lastReplyByName: true, lastReplyAt: true,
                batch: { select: { id: true, name: true, businessId: true } },
                assignedUser: { select: { id: true, firstName: true, lastName: true } }
            }
        });
        if (!lead) return res.status(404).json({ error: 'Lead not found' });

        const rows = await prisma.leadBatchAssignment.findMany({
            where: { leadId, ...(lead.batchId ? { NOT: { batchId: lead.batchId } } : {}) },
            include: {
                batch: { select: { id: true, name: true } },
                assignedUser: { select: { id: true, firstName: true, lastName: true } }
            },
            orderBy: { createdAt: 'asc' }
        });

        const batchIds = [lead.batchId, ...rows.map(r => r.batchId)].filter(Boolean);
        const paidSet = batchIds.length > 0 ? await getApprovedBatchPhoneSet({ batchIds }) : new Set();

        res.status(200).json({
            leadId,
            isManager: isManagerReq(req),
            lastReplyByName: lead.lastReplyByName,
            lastReplyAt: lead.lastReplyAt,
            primary: lead.batchId ? {
                batchId: lead.batchId,
                batchName: lead.batch?.name || `Batch ${lead.batchId}`,
                assignedTo: lead.assignedTo,
                assignedName: fullName(lead.assignedUser),
                enrolled: isPaidForBatch(paidSet, lead.phone, lead.batchId)
            } : null,
            extras: rows.map(r => ({
                id: r.id,
                batchId: r.batchId,
                batchName: r.batch?.name || `Batch ${r.batchId}`,
                assignedTo: r.assignedTo,
                assignedName: fullName(r.assignedUser),
                source: r.source,
                unreadCount: r.unreadCount,
                enrolled: isPaidForBatch(paidSet, lead.phone, r.batchId)
            }))
        });
    } catch (error) {
        console.error('getLeadBatches error:', error);
        res.status(500).json({ error: 'Failed to load lead batches' });
    }
};

// POST /after-seminar-crm/leads/:leadId/batches  { batchId, assignedTo }
exports.addLeadBatch = async (req, res) => {
    try {
        if (!isManagerReq(req)) return res.status(403).json({ error: 'Only managers can add batches to a chat.' });
        const leadId = parseInt(req.params.leadId);
        const batchId = parseInt(req.body.batchId);
        const assignedTo = req.body.assignedTo ? parseInt(req.body.assignedTo) : null;
        if (isNaN(leadId) || isNaN(batchId)) return res.status(400).json({ error: 'leadId and batchId are required' });

        const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { id: true, batchId: true } });
        if (!lead) return res.status(404).json({ error: 'Lead not found' });
        if (!lead.batchId) return res.status(400).json({ error: 'Set the main batch first (Allocate to Batch), then add extra batches.' });
        if (lead.batchId === batchId) return res.status(400).json({ error: 'This is already the main batch of this chat.' });

        const row = await prisma.leadBatchAssignment.upsert({
            where: { leadId_batchId: { leadId, batchId } },
            update: { assignedTo },
            create: { leadId, batchId, assignedTo, source: 'MANUAL' }
        });
        res.status(200).json({ success: true, row });
    } catch (error) {
        console.error('addLeadBatch error:', error);
        res.status(500).json({ error: 'Failed to add batch' });
    }
};

// PATCH /after-seminar-crm/lead-batches/:id  { assignedTo }
exports.updateLeadBatchAssignment = async (req, res) => {
    try {
        if (!isManagerReq(req)) return res.status(403).json({ error: 'Only managers can change the coordinator of a batch.' });
        const id = parseInt(req.params.id);
        const assignedTo = req.body.assignedTo ? parseInt(req.body.assignedTo) : null;
        const row = await prisma.leadBatchAssignment.update({
            where: { id },
            data: { assignedTo, unreadCount: 0 }
        });
        res.status(200).json({ success: true, row });
    } catch (error) {
        console.error('updateLeadBatchAssignment error:', error);
        res.status(500).json({ error: 'Failed to update batch coordinator' });
    }
};

// DELETE /after-seminar-crm/lead-batches/:id
exports.removeLeadBatchAssignment = async (req, res) => {
    try {
        if (!isManagerReq(req)) return res.status(403).json({ error: 'Only managers can remove a batch.' });
        await prisma.leadBatchAssignment.delete({ where: { id: parseInt(req.params.id) } });
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('removeLeadBatchAssignment error:', error);
        res.status(500).json({ error: 'Failed to remove batch' });
    }
};

// GET /after-seminar-crm/lead-batches/unassigned?businessId=&batchId=
// Extra batches waiting for a coordinator (created automatically when a payment is approved).
exports.getUnassignedLeadBatches = async (req, res) => {
    try {
        const { businessId, batchId } = req.query;
        const where = { assignedTo: null };
        if (batchId && batchId !== 'ALL' && !isNaN(parseInt(batchId))) where.batchId = parseInt(batchId);
        else if (businessId && businessId !== 'ALL' && !isNaN(parseInt(businessId))) where.batch = { businessId: parseInt(businessId) };

        const rows = await prisma.leadBatchAssignment.findMany({
            where,
            include: {
                batch: { select: { id: true, name: true } },
                lead: {
                    select: {
                        id: true, name: true, phone: true, batchId: true,
                        batch: { select: { name: true } },
                        assignedUser: { select: { id: true, firstName: true, lastName: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 500
        });

        const list = rows
            .filter(r => r.lead && r.lead.batchId !== r.batchId)
            .map(r => ({
                id: r.id,
                leadId: r.leadId,
                name: r.lead.name,
                phone: (r.lead.phone || '').split('_')[0],
                batchId: r.batchId,
                batchName: r.batch?.name,
                mainBatchName: r.lead.batch?.name || null,
                mainCoordinatorId: r.lead.assignedUser?.id || null,
                mainCoordinatorName: fullName(r.lead.assignedUser),
                source: r.source,
                createdAt: r.createdAt
            }));
        res.status(200).json({ count: list.length, rows: list });
    } catch (error) {
        console.error('getUnassignedLeadBatches error:', error);
        res.status(500).json({ error: 'Failed to load unassigned batches' });
    }
};

// POST /after-seminar-crm/lead-batches/backfill { businessId, apply }
exports.runBackfill = async (req, res) => {
    try {
        if (!isManagerReq(req)) return res.status(403).json({ error: 'Managers only' });
        const result = await backfillExtraBatches({ businessId: req.body.businessId || null, dryRun: !req.body.apply });
        res.status(200).json(result);
    } catch (error) {
        console.error('runBackfill error:', error);
        res.status(500).json({ error: 'Backfill failed' });
    }
};
