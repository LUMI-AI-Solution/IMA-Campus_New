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

const prisma = global.__imaPrisma || base.$extends({
    query: {
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
