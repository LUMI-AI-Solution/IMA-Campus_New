const { PrismaClient } = require('@prisma/client');
const aiVerificationController = require('./controllers/aiVerificationController');
const jwt = require('jsonwebtoken');

async function main() {
    const token = 'Bearer ' + jwt.sign({ id: 1, role: 'admin', internal: true }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1h' });
    console.log("Triggering verification internally for batch 5 business 1...");
    await aiVerificationController.executeBulkVerificationInternal("5", "1", null, token);
    console.log("Done.");
}

main().catch(console.error);
