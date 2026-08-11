const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { fetchGSheetTransactions } = require('./controllers/aiVerificationController');

async function test() {
    try {
        const result = await fetchGSheetTransactions('July 2026');
        if (result.rows.length > 0) {
            console.log("Headers found:", Object.keys(result.rows[0]));
            console.log("First row data:", result.rows[0]);
        } else {
            console.log("No rows found.");
        }
    } catch (e) {
        console.error(e);
    }
}
test();
