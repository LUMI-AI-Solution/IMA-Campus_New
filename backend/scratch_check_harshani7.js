const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const httpMocks = require('node-mocks-http');
const controller = require('./controllers/afterSeminarInquiryController');

async function main() {
  const req = httpMocks.createRequest({
    method: 'GET',
    url: '/after-seminar-crm/leads',
    query: {
        tab: 'ASSIGNED',
        staffId: 49,
        loggedUserRole: 'COORDINATOR',
        businessId: 1, 
        inquiryType: 'OPEN_SEMINAR,NORMAL',
        limit: 10
    },
    user: { id: 49, role: 'COORDINATOR' }
  });
  
  const res = httpMocks.createResponse();
  
  await controller.getLeads(req, res);
  
  const data = JSON.parse(res._getData());
  console.log("Leads returned:", data.leads ? data.leads.length : 0);
  console.log("Counts:", data.counts);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
