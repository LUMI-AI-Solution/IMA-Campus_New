const axios = require('axios');
const FormData = require('form-data');

async function test() {
  const fd = new FormData();
  fd.append('stepOrder', '1');
  fd.append('message', 'Test Edit from node script');

  try {
    const res = await axios.put('http://localhost:5000/api/admin/crm/auto-reply/67', fd, {
      headers: fd.getHeaders()
    });
    console.log(res.data);
  } catch (err) {
    console.error(err.response ? err.response.data : err.message);
  }
}
test();
