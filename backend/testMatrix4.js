const { getFinanceMatrix } = require('./controllers/financeController.js');

const req = {
    query: { businessId: 9, batchId: 5 },
    user: { userId: 1, role: 'SYSTEM_ADMIN' }
};

const res = {
    status: function(c) { this.c = c; return this; },
    json: function(data) { 
        console.log('Status', this.c);
        const st = data.students[0];
        console.log('Subjects:', data.subjects);
        console.log('First student matrixValues for active month:');
        if (st) {
            const mgId = Object.keys(st.matrixValues)[0];
            console.log('MG:', mgId, st.matrixValues[mgId]);
        }
    }
};

getFinanceMatrix(req, res).catch(console.error);
