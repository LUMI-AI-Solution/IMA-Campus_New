const axios = require('axios');
const api = axios.create({ baseURL: 'http://localhost:5000/api' });
console.log(api.getUri({ url: '/after-seminar-crm/test' }));
console.log(api.getUri({ url: 'after-seminar-crm/test' }));
