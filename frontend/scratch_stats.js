import axios from 'axios';
axios.get('http://localhost:5000/api/admin/staff')
  .then(res => console.log(JSON.stringify(res.data.slice(0, 2), null, 2)))
  .catch(err => console.error(err.message));
