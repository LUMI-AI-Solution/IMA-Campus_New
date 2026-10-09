// Mulu system eke hema API route ekakatama: token ekak nathuwa request ekak
// yawwama 401 enna ona. Public wenna ona routes tika tests/publicRoutes.js eke.
//
// Run: npm test   (backend folder eke idan)

const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const { loadApp } = require('./helpers/loadApp');
const publicRoutes = require('./publicRoutes');

const { app, routes } = loadApp();
const isPublic = (r) =>
    publicRoutes.includes(r.key) || publicRoutes.publicPrefixes.some((p) => r.pattern.startsWith(p));

let server;
let baseUrl;

test.before(async () => {
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => new Promise((resolve) => server.close(resolve)));

test('server.js eken routes load wenawa', () => {
    assert.ok(routes.length > 100, `routes ${routes.length}k witharai hambune`);
});

for (const route of routes) {
    if (isPublic(route)) continue;
    test(`${route.key} - login nathuwa 401 (${route.file})`, async () => {
        const url = baseUrl + route.pattern.replace(/:[A-Za-z0-9_]+\??/g, '1');
        const hasBody = !['GET', 'HEAD', 'DELETE'].includes(route.method);
        const res = await fetch(url, {
            method: route.method,
            headers: hasBody ? { 'Content-Type': 'application/json' } : {},
            body: hasBody ? '{}' : undefined,
            redirect: 'manual',
        });
        assert.strictEqual(
            res.status,
            401,
            `${route.key} token nathuwa ${res.status} dunna. ` +
            `Route ekata verifyToken danna, nathnam (eththatama public nam) tests/publicRoutes.js ekata danna.`
        );
    });
}
