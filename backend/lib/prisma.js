// ONE shared PrismaClient for the whole backend.
// Before this, ~78 files each did `new PrismaClient()`, and every instance opened its own
// MySQL connection pool. That exhausts MySQL connections, so simple queries (like saving a
// call remark) wait in a queue -> slow saves / random timeouts.
const prisma = require('../src/core/db');

if (!global.__imaPrisma) {
    global.__imaPrisma = prisma;
}

module.exports = prisma;
