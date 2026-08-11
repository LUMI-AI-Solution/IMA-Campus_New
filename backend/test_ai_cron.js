const { PrismaClient } = require('@prisma/client');
const aiVerificationController = require('./controllers/aiVerificationController');
const jwt = require('jsonwebtoken');

async function main() {
    const token = 'Bearer ' + jwt.sign({ id: 1, role: 'admin', internal: true }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1h' });
    console.log("Triggering verification internally...");
    await aiVerificationController.executeBulkVerificationInternal("1", "1", null, token);
    console.log("Done.");
}

main().catch(console.error);
