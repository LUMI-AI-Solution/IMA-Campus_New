const fs = require('fs');
const csv = require('csv-parser');
const aiVerificationController = require('./controllers/aiVerificationController');

const ids = [];
fs.createReadStream('/root/IMA-Campus/backend/missing_student_details.csv')
  .pipe(csv())
  .on('data', (row) => {
    if (row['Payment ID']) ids.push(parseInt(row['Payment ID']));
  })
  .on('end', async () => {
    console.log(`Loaded ${ids.length} IDs to re-verify.`);
    for (const id of ids) {
       console.log(`\nVerifying Payment ID: ${id}`);
       const req = {
           body: {
               paymentId: id,
               autoVerify: true,
               autoDetect: true
           }
       };
       const res = {
           status: function(code) {
               this.statusCode = code;
               return this;
           },
           json: function(data) {
               console.log(`Result [${this.statusCode}]:`, data.status || data.error || data.message || 'OK');
               return this;
           }
       };
       try {
           await aiVerificationController.verifySinglePayment(req, res);
       } catch (err) {
           console.log(`Error on ${id}:`, err.message);
       }
    }
    console.log("\nDone!");
  });
