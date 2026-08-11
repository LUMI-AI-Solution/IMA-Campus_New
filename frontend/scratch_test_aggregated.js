const fs = require('fs');
// Let's just manually compute the aggregated rounds from the backend test
// I'll call the API from backend and see what the frontend would compute.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const leads = await prisma.lead.findMany({ 
    where: { inquiryType: 'NEW_INQ' },
    include: { assignedUser: true }
  });
  
  let totalAssigned = 0;
  let staffMap = {};
  const now = new Date();
  
  leads.forEach(l => {
    if (l.assignedTo) {
      totalAssigned++;
      const staffName = l.assignedUser ? `${l.assignedUser.firstName}` : 'Unknown';
      if (!staffMap[staffName]) {
        staffMap[staffName] = { rounds: { 1: {assigned:0}, 2: {assigned:0}, NON_ENROLLED: {assigned:0}, PAID: {assigned:0} } };
      }
      
      const isEnrolled = l.enrollmentStatus === 'ENROLLED' || l.enrollmentStatus === 'PAID';
      const round = l.newInqRound || 1;
      const assignedDaysPassed = (now - new Date(l.assignedAt || l.createdAt)) / (1000 * 60 * 60 * 24);
      
      if (isEnrolled) {
        staffMap[staffName].rounds.PAID.assigned++;
      } else if (assignedDaysPassed >= 7 || round === 'NON_ENROLLED' || l.enrollmentStatus === 'NON_ENROLLED') {
        staffMap[staffName].rounds.NON_ENROLLED.assigned++;
      } else if (round === 2) {
        staffMap[staffName].rounds[2].assigned++;
      } else {
        staffMap[staffName].rounds[1].assigned++;
      }
    }
  });
  
  let aggregatedRounds = { '1': {assigned:0}, '2': {assigned:0}, 'NON_ENROLLED': {assigned:0}, 'PAID': {assigned:0} };
  Object.values(staffMap).forEach(staff => {
    ['1', '2', 'NON_ENROLLED', 'PAID'].forEach(round => {
      aggregatedRounds[round].assigned += staff.rounds[round].assigned;
    });
  });
  
  console.log("totalAssigned:", totalAssigned);
  console.log("aggregatedRounds:", aggregatedRounds);
}
run();
