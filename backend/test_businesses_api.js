const axios = require('axios');
axios.get('http://localhost:5000/api/student/get-businesses') // or whatever the endpoint is
  .catch(console.error);
