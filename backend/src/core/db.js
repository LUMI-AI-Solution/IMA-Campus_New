// The ONE Prisma client for the whole backend.
// Reuse across hot-reloads / repeated requires (tests can also put a fake client here).
const prisma = globalThis.__imaPrisma || require('../../lib/prisma');
globalThis.__imaPrisma = prisma;
global.prisma = prisma;
module.exports = prisma;

