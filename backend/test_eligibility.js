const { calculateUpgrade } = require('./controllers/upgradePricingController');
const req = { user: { userId: 1, id: 1 } };
const res = { 
    status: (s) => ({ json: (j) => console.log('STATUS', s, j) }),
    json: (j) => console.log('JSON', j)
};
calculateUpgrade(req, res).catch(console.error).finally(() => setTimeout(() => process.exit(0), 1000));
