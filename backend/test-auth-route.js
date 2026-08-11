const jwt = require('jsonwebtoken');
const axios = require('axios');

const secret = "ima_super_secret_token_12345";
const token = jwt.sign({ userId: 1, role: 'SYSTEM_ADMIN' }, secret, { expiresIn: '1h' });

axios.get('http://localhost:5000/api/admin/data-export/module-one?businessId=1&batchId=5', {
  headers: { Authorization: `Bearer ${token}` }
})
.then(res => console.log('SUCCESS:', res.status, res.data ? 'Data received' : 'No data'))
.catch(err => console.log('ERROR:', err.response ? err.response.status : err.message));
