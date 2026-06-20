const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getBankTransactions } = require('./controllers/aiVerificationController');

async function test() {
    global.prisma = prisma; 
    
    const req = { query: { statementMonth: 'May 2026' } };
    const res = {
        status: function(code) {
            return {
                json: function(data) {
                    console.log("RESPONSE DATA:");
                    console.log("Headers length:", data.headers ? data.headers.length : 'undefined');
                    console.log("Headers:", data.headers);
                }
            };
        }
    };
    
    await getBankTransactions(req, res);
}

test().catch(console.error).finally(() => prisma.$disconnect());
