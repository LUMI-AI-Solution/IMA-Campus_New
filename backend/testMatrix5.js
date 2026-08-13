const { getFinanceMatrix } = require('./controllers/financeController.js');

const req = {
    query: { businessId: 9, batchId: 5 },
    user: { userId: 1, role: 'SYSTEM_ADMIN' }
};

const res = {
    status: function(c) { this.c = c; return this; },
    json: function(data) { 
        console.log('Status', this.c);
        
        for (let st of data.students) {
           let hasEnglishTotal = false;
           for (let mgId of Object.keys(st.matrixValues)) {
               if (st.matrixValues[mgId]['ENGLISH'] && st.matrixValues[mgId]['ENGLISH'].total > 0) {
                   hasEnglishTotal = true;
               }
           }
           if (hasEnglishTotal) {
               console.log('Student', st.id, 'has English > 0');
           }
        }
        console.log('Done searching.');
    }
};

getFinanceMatrix(req, res).catch(console.error);
