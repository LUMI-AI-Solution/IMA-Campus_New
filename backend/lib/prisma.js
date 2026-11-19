// ONE shared PrismaClient for the whole backend.
// Before this, ~78 files each did `new PrismaClient()`, and every instance opened its own
// MySQL connection pool. That exhausts MySQL connections, so simple queries (like saving a
// call remark) wait in a queue -> slow saves / random timeouts.
const { PrismaClient } = require('@prisma/client');

const base = global.__imaPrismaBase || new PrismaClient();
global.__imaPrismaBase = base;

// 🔥 Payment.approvedAt: stamped automatically whenever a payment becomes APPROVED (status 1),
// from ANY code path (manual approve, AI verification, bulk approve, admin create...).
// Cleared when a payment leaves status 1 (rejected / reverted), so a re-approval gets a new time.
const statusOf = (data) => {
    if (!data || data.status === undefined || data.status === null) return undefined;
    const v = typeof data.status === 'object' ? data.status.set : data.status;
    const n = parseInt(v);
    return isNaN(n) ? undefined : n;
};

const stampCreate = (data) => {
    if (!data) return data;
    if (statusOf(data) === 1 && data.approvedAt === undefined) return { ...data, approvedAt: new Date() };
    return data;
};

// 🔒 CONTENT PLACEMENT GUARD 🔒
// A content's folder (contentGroupId) and order (itemOrder) may ONLY change through the Content Hub
// routes a coordinator uses (edit / create / folder delete). Any other code path (student web/app
// pages, background jobs, future "auto-heal" code) is BLOCKED: the folder/order fields are removed
// from the update and the attempt is written to ContentPlacementLog (blocked = true).
// Every allowed change is logged too, so you can always see who moved what, and from where.
const { currentPlacementContext } = require('../utils/requestContext');
const PLACEMENT_KEYS = ['contentGroupId', 'itemOrder', 'group'];

const placementInfo = () => {
    const ctx = currentPlacementContext();
    if (!ctx) return { allowed: false, endpoint: 'NOT A CONTENT HUB EDIT (student page / app / job)', userId: null };
    return { allowed: true, endpoint: ctx.endpoint, userId: ctx.userId };
};

const touchesPlacement = (data) => !!data && PLACEMENT_KEYS.some(k => data[k] !== undefined);
const readSetValue = (v) => (v && typeof v === 'object' && 'set' in v ? v.set : v);
const groupIdFromData = (data) => {
    if (data.contentGroupId !== undefined) return readSetValue(data.contentGroupId);
    if (data.group?.connect?.id !== undefined) return data.group.connect.id;
    if (data.group?.disconnect) return null;
    return undefined;
};
const stripPlacement = (data) => {
    const out = { ...data };
    PLACEMENT_KEYS.forEach(k => { delete out[k]; });
    return out;
};
const writePlacementLogs = (rows) => {
    if (!rows || rows.length === 0) return;
    base.contentPlacementLog.createMany({ data: rows }).catch(e => console.error('ContentPlacementLog write failed:', e.message));
};

const guardContentUpdate = async (args, query, many) => {
    if (!touchesPlacement(args.data)) return query(args);
    const info = placementInfo();
    let before = [];
    try {
        before = await base.content.findMany({ where: args.where, select: { id: true, contentGroupId: true, itemOrder: true }, take: 5000 });
    } catch (e) { /* logging only */ }
    const toGroup = groupIdFromData(args.data);
    const toOrder = args.data.itemOrder !== undefined ? parseInt(readSetValue(args.data.itemOrder)) : undefined;

    if (!info.allowed) {
        const attempted = before.filter(b => (toGroup !== undefined && b.contentGroupId !== toGroup) || (toOrder !== undefined && b.itemOrder !== toOrder));
        if (attempted.length > 0) {
            console.warn(`[CONTENT GUARD] Blocked folder/order change of ${attempted.length} content(s) from ${info.endpoint}`);
            writePlacementLogs(attempted.map(b => ({
                contentId: b.id, fromGroupId: b.contentGroupId, toGroupId: toGroup === undefined ? b.contentGroupId : toGroup,
                fromOrder: b.itemOrder, toOrder: toOrder === undefined ? b.itemOrder : toOrder,
                blocked: true, userId: info.userId, endpoint: info.endpoint
            })));
        }
        args.data = stripPlacement(args.data);
        return query(args);
    }

    const result = await query(args);
    writePlacementLogs(before
        .filter(b => (toGroup !== undefined && b.contentGroupId !== toGroup) || (toOrder !== undefined && !isNaN(toOrder) && b.itemOrder !== toOrder))
        .map(b => ({
            contentId: b.id, fromGroupId: b.contentGroupId, toGroupId: toGroup === undefined ? b.contentGroupId : toGroup,
            fromOrder: b.itemOrder, toOrder: toOrder === undefined || isNaN(toOrder) ? b.itemOrder : toOrder,
            blocked: false, userId: info.userId, endpoint: info.endpoint
        })));
    return result;
};

const prisma = global.__imaPrisma || base.$extends({
    query: {
        content: {
            async update({ args, query }) { return guardContentUpdate(args, query, false); },
            async updateMany({ args, query }) { return guardContentUpdate(args, query, true); },
            async upsert({ args, query }) {
                if (touchesPlacement(args.update) && !placementInfo().allowed) {
                    console.warn(`[CONTENT GUARD] Blocked folder/order change in upsert from ${placementInfo().endpoint}`);
                    args.update = stripPlacement(args.update);
                }
                return query(args);
            }
        },
        payment: {
            async create({ args, query }) {
                args.data = stampCreate(args.data);
                return query(args);
            },
            async createMany({ args, query }) {
                if (Array.isArray(args.data)) args.data = args.data.map(stampCreate);
                else args.data = stampCreate(args.data);
                return query(args);
            },
            async update({ args, query }) {
                const st = statusOf(args.data);
                if (st !== undefined && args.data.approvedAt === undefined) {
                    if (st === 1) {
                        try {
                            const cur = await base.payment.findUnique({ where: args.where, select: { status: true, approvedAt: true } });
                            if (!cur || cur.status !== 1 || !cur.approvedAt) args.data = { ...args.data, approvedAt: new Date() };
                        } catch (e) { /* never block the real update */ }
                    } else {
                        args.data = { ...args.data, approvedAt: null };
                    }
                }
                return query(args);
            },
            async updateMany({ args, query }) {
                const st = statusOf(args.data);
                if (st !== undefined && args.data.approvedAt === undefined) {
                    if (st === 1) {
                        try {
                            await base.payment.updateMany({
                                where: { AND: [args.where || {}, { status: { not: 1 } }] },
                                data: { approvedAt: new Date() }
                            });
                        } catch (e) { /* never block the real update */ }
                    } else {
                        args.data = { ...args.data, approvedAt: null };
                    }
                }
                return query(args);
            },
            async upsert({ args, query }) {
                args.create = stampCreate(args.create);
                const st = statusOf(args.update);
                if (st !== undefined && args.update.approvedAt === undefined) {
                    if (st === 1) {
                        try {
                            const cur = await base.payment.findUnique({ where: args.where, select: { status: true, approvedAt: true } });
                            if (cur && (cur.status !== 1 || !cur.approvedAt)) args.update = { ...args.update, approvedAt: new Date() };
                        } catch (e) { /* ignore */ }
                    } else {
                        args.update = { ...args.update, approvedAt: null };
                    }
                }
                return query(args);
            }
        }
    }
});
global.__imaPrisma = prisma;
globalThis.__imaPrisma = prisma;
global.prisma = prisma;

module.exports = prisma;
