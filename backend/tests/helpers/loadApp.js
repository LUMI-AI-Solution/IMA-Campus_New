// Test helper: mulu backend eke routes tika database ekak nathuwa load karanawa.
//
// - server.js eke thiyena `app.use('/path', require('./routes/x'))` lines kiyawala
//   e piliwelatama routes mount karanawa (piliwela wadagath: kalin mount wena
//   router ekaka `router.use(verifyToken)` passe ena routes walatath balapanawa).
// - Controllers, Prisma (database) saha multer (file upload) stub karanawa.
//   E nisa test eka kisima data ekak kiyawanne ne, liyanne ne.
// - Auth middleware eka (middlewares/authMiddleware.js) eththa eka.
//
// Stub controller ekakata request ekak awoth eka { __reachedHandler } kiyala
// 200 ekak denawa. E kiyanne: "auth eka pahu karala handler ekata awa".

const Module = require('module');
const path = require('path');
const fs = require('fs');

const BACKEND_DIR = path.join(__dirname, '..', '..');
const SERVER_FILE = path.join(BACKEND_DIR, 'server.js');

function makeHandlerStub(name) {
    const fn = function (...args) {
        const res = args[1];
        if (res && typeof res.status === 'function' && typeof res.json === 'function') {
            return res.status(200).json({ __reachedHandler: name });
        }
        // e.g. controller.upload.single('file') wage middleware factory call ekak
        return makeHandlerStub(name);
    };
    return new Proxy(fn, {
        get(target, prop) {
            if (typeof prop === 'symbol' || prop in target) return target[prop];
            if (prop === 'then') return undefined;
            return makeHandlerStub(`${name}.${prop}`);
        }
    });
}

function makePrismaStub() {
    const model = new Proxy({}, { get: () => async () => null });
    class PrismaClient {
        constructor() {
            return new Proxy(this, {
                get(target, prop) {
                    if (typeof prop === 'symbol' || prop === 'then') return undefined;
                    if (String(prop).startsWith('$')) return async () => null;
                    return model;
                }
            });
        }
    }
    return { PrismaClient, Prisma: {} };
}

function makeMulterStub() {
    const pass = (req, res, next) => next();
    const instance = { single: () => pass, array: () => pass, fields: () => pass, any: () => pass, none: () => pass };
    const multer = () => instance;
    multer.diskStorage = () => ({});
    multer.memoryStorage = () => ({});
    return multer;
}

function installStubs() {
    const originalLoad = Module._load;
    const prismaStub = makePrismaStub();
    const multerStub = makeMulterStub();
    Module._load = function (request, parent, isMain) {
        if (request === '@prisma/client') return prismaStub;
        if (request === 'multer') return multerStub;
        const fromBackend = parent && parent.filename && parent.filename.startsWith(BACKEND_DIR)
            && !parent.filename.includes(`${path.sep}node_modules${path.sep}`);
        if (fromBackend && /(^|\/)controllers\//.test(request)) {
            return makeHandlerStub(path.basename(request));
        }
        return originalLoad.apply(this, arguments);
    };
    return () => { Module._load = originalLoad; };
}

// server.js eken route mounts tika piliwelata kiyawanawa.
function readMounts() {
    const src = fs.readFileSync(SERVER_FILE, 'utf8');
    const vars = {};
    for (const m of src.matchAll(/const\s+(\w+)\s*=\s*require\('\.\/routes\/([^']+)'\)/g)) {
        vars[m[1]] = m[2];
    }
    const mounts = [];
    const re = /^app\.use\(\s*(?:'([^']*)'\s*,\s*)?(?:require\('\.\/routes\/([^']+)'\)|(\w+))\s*\)/gm;
    for (const m of src.matchAll(re)) {
        const file = m[2] || vars[m[3]];
        if (!file) continue; // route file ekak nemei (cors, auditMiddleware, ...)
        mounts.push({ prefix: m[1] || '', file });
    }
    return mounts;
}

function listRoutes(router, prefix) {
    const out = [];
    for (const layer of router.stack || []) {
        if (!layer.route) continue;
        const paths = Array.isArray(layer.route.path) ? layer.route.path : [layer.route.path];
        for (const p of paths) {
            if (typeof p !== 'string') continue;
            for (const method of Object.keys(layer.route.methods)) {
                if (method === '_all') continue;
                const pattern = (prefix + p).replace(/\/+$/, '') || '/';
                out.push({ method: method.toUpperCase(), pattern });
            }
        }
    }
    return out;
}

function loadApp() {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-only-secret';
    const restore = installStubs();
    try {
        const express = require('express');
        const app = express();
        app.use(express.json());

        const routes = [];
        const seen = new Set();
        for (const { prefix, file } of readMounts()) {
            const router = require(path.join(BACKEND_DIR, 'routes', file));
            app.use(prefix || '/', router);
            for (const r of listRoutes(router, prefix)) {
                const key = `${r.method} ${r.pattern}`;
                if (seen.has(key)) continue;
                seen.add(key);
                routes.push({ ...r, key, file: `routes/${file}.js` });
            }
        }
        return { app, routes };
    } finally {
        restore();
    }
}

module.exports = { loadApp, readMounts };
