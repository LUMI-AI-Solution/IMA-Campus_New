// Memory watch: find which requests make ima-backend's memory grow.
// - Every minute: one line with rss / heap.
// - Any request that takes > 3 s, or after which the heap is > 150 MB bigger: one line with the path.
// Paths only (query strings cut), no user data.

const MB = (n) => Math.round(n / 1048576);
let peakRss = 0;

function middleware(req, res, next) {
    const t0 = Date.now();
    const h0 = process.memoryUsage().heapUsed;
    res.on('finish', () => {
        const ms = Date.now() - t0;
        const m = process.memoryUsage();
        const grew = m.heapUsed - h0;
        if (ms > 3000 || grew > 150 * 1048576) {
            const path = String(req.originalUrl || req.url || '').split('?')[0].replace(/\/\d+(?=\/|$)/g, '/:id');
            console.log(`[mem-watch] ${req.method} ${path} ${res.statusCode} ${ms}ms heap+${MB(grew)}MB heap=${MB(m.heapUsed)}MB rss=${MB(m.rss)}MB`);
        }
    });
    next();
}

function start() {
    const timer = setInterval(() => {
        const m = process.memoryUsage();
        peakRss = Math.max(peakRss, m.rss);
        console.log(`[mem-watch] rss=${MB(m.rss)}MB heapUsed=${MB(m.heapUsed)}MB heapTotal=${MB(m.heapTotal)}MB external=${MB(m.external)}MB arrayBuffers=${MB(m.arrayBuffers)}MB peakRss=${MB(peakRss)}MB`);
    }, 60000);
    if (timer.unref) timer.unref();
}

module.exports = { middleware, start };
