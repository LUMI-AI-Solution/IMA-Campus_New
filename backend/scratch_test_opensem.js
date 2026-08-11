const { getOpenSeminarStats } = require('./controllers/afterSeminarManagerStatsController');

const req = {
  query: { businessId: 'ALL', batchId: 'ALL' }
};

const res = {
  status: function(code) {
    return this;
  },
  json: function(data) {
    let r1Sum = 0;
    let r2Sum = 0;
    let neSum = 0;
    let paidSum = 0;
    
    data.staffBreakdown.forEach(staff => {
       r1Sum += staff.rounds[1].assigned;
       r2Sum += staff.rounds[2].assigned;
       neSum += staff.rounds.NON_ENROLLED.assigned;
       paidSum += staff.rounds.PAID.assigned;
    });
    
    console.log("totalAssigned from response:", data.totalAssigned);
    console.log("staffBreakdown length:", data.staffBreakdown.length);
    if (data.staffBreakdown.length > 0) {
      console.log("r1Sum:", r1Sum);
      console.log("r2Sum:", r2Sum);
      console.log("neSum:", neSum);
      console.log("paidSum:", paidSum);
      console.log("total sum of rounds:", r1Sum + r2Sum + neSum + paidSum);
    }
  }
};

getOpenSeminarStats(req, res).catch(console.error);
