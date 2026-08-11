const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Generate a token or use controller logic directly
    const { getManagerDashboardStats } = require('./controllers/afterSeminarManagerStatsController');
    
    // Mock req, res
    const req = { query: { businessId: 1, batchId: 'ALL' } };
    const res = {
        status: (code) => ({
            json: (data) => console.log(JSON.stringify(data, null, 2).substring(0, 3000))
        }),
        json: (data) => console.log(JSON.stringify(data, null, 2).substring(0, 3000))
    };

    await getManagerDashboardStats(req, res);
}

main().finally(() => prisma.$disconnect());
