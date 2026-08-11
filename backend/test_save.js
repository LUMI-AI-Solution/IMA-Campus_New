const axios = require('axios');
axios.post('http://localhost:5175/api/coordinator-crm/leads/update-call', {
  leadId: 41615,
  method: 'Direct Call',
  status: 'answered',
  feedback: 'test',
  coordinationRound: 1
}, { headers: { Authorization: `Bearer test` } }).catch(e => console.error(e.response ? e.response.data : e.message));
