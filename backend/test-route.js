const axios = require('axios');
axios.get('http://localhost:5000/api/admin/data-export/module-one?businessId=1&batchId=5')
  .then(res => console.log('SUCCESS:', res.status))
  .catch(err => console.log('ERROR:', err.response ? err.response.status : err.message));
