// 🔒 Content placement context.
// Only Content Hub handlers wrapped with allowContentPlacement() may change a content's folder/order.
// The context is opened when the HANDLER starts (after auth + multer), so it is never lost, and
// everything the handler awaits (Prisma calls) runs inside it.
const { AsyncLocalStorage } = require('async_hooks');

const placementAls = new AsyncLocalStorage();

const allowContentPlacement = (handler) => (req, res, next) => {
    const path = String(req.originalUrl || req.url || '').split('?')[0];
    const ctx = {
        endpoint: `${String(req.method || '').toUpperCase()} ${path}`.slice(0, 250),
        userId: req.user ? parseInt(req.user.id || req.user.userId) || null : null
    };
    return placementAls.run(ctx, () => handler(req, res, next));
};

const currentPlacementContext = () => placementAls.getStore() || null;

module.exports = { allowContentPlacement, currentPlacementContext };
