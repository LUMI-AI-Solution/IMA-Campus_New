const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/ima-db', { useNewUrlParser: true, useUnifiedTopology: true })
.then(async () => {
    const Lead = mongoose.model('Lead', new mongoose.Schema({}, { strict: false }));
    const allNewInq = await Lead.find({ campaignType: 'NEW_INQ' });
    let r1 = 0, r2 = 0, r3 = 0, r4 = 0, non_enrolled_status = 0;
    allNewInq.forEach(l => {
        const round = l.newInqRound || 1;
        if (round === 1) r1++;
        else if (round === 2) r2++;
        else if (round === 3) r3++;
        else r4++;
        if (l.enrollmentStatus === 'NON_ENROLLED') non_enrolled_status++;
    });
    console.log(`Total New Inq Leads: ${allNewInq.length}`);
    console.log(`Round 1: ${r1}, Round 2: ${r2}, Round 3: ${r3}, Round 4+: ${r4}`);
    console.log(`Status NON_ENROLLED: ${non_enrolled_status}`);
    process.exit(0);
})
.catch(console.log);
