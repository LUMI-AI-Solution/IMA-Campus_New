const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getBankTransactions } = require('./controllers/aiVerificationController');

async function test() {
    global.prisma = prisma; // Provide global prisma just in case, though controller uses its own
    
    // Simulate req/res for getBankTransactions
    const req = { query: { statementMonth: 'May-2026' } };
    const res = {
        status: function(code) {
            return {
                json: function(data) {
                    console.log("RESPONSE DATA:");
                    console.log("Headers length:", data.headers.length);
                    console.log("Headers:", data.headers);
                    if (data.rows && data.rows.length > 0) {
                        console.log("First row:", data.rows[0]);
                    }
                }
            };
        }
    };
    
    await getBankTransactions(req, res);
}

test().catch(console.error).finally(() => prisma.$disconnect());
