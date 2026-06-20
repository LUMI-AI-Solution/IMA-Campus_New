const { getBankTransactions } = require('./controllers/aiVerificationController.js');

async function test() {
    const req = { query: { statementMonth: 'May-2026' } };
    const res = {
        status: (code) => ({
            json: (data) => console.log(JSON.stringify(data.headers))
        })
    };
    
    // Quick mock for prisma
    global.prisma = require('@prisma/client');
    const { PrismaClient } = global.prisma;
    const prisma = new PrismaClient();
    global.prisma = prisma;
    
    await getBankTransactions(req, res);
    prisma.$disconnect();
}
test().catch(console.error);
