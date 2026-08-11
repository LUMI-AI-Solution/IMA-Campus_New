const { getStaff } = require('./controllers/staffController.js');
const httpMocks = require('node-mocks-http');

async function test() {
    const req = httpMocks.createRequest({
        method: 'GET',
        url: '/admin/staff',
        query: {
            startDate: '2026-07-01',
            endDate: '2026-07-31'
        },
        user: {
            id: 1,
            role: 'SYSTEM_ADMIN'
        }
    });
    const res = httpMocks.createResponse();
    await getStaff(req, res);
    
    const data = res._getJSONData();
    const withStats = data.filter(s => s.inboundStats.totalCalls > 0 || s.outboundStats.totalCalls > 0 || s.missedCalls > 0);
    console.log(JSON.stringify(withStats, null, 2));
}

test().catch(console.error);
