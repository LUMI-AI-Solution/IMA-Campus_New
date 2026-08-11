const axios = require('axios');
async function test() {
  const tokenUrl = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=nsKzuoSbQLqeEKFO25W3QA`;
  const authHeader = 'Basic ' + Buffer.from(`Lzn79CR2W2LLKVAm9thw:cs0qQYhl3HVKRh9liOmA8SNz3217njHY`).toString('base64');
  const res1 = await axios.post(tokenUrl, {}, { headers: { 'Authorization': authHeader } });
  const token = res1.data.access_token;

  try {
    const encodedId = encodeURIComponent('qKOpRjZuIWMJzVi0r5ZmlVm1V4L9uSM937KdWoIlOeiiD75wfsnKzncl-6Fqiqm7.Fo6gz9bRx0jqSlqn');
    const res2 = await axios.get(`https://api.zoom.us/v2/meetings/${encodedId}/recordings`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(res2.data);
  } catch (e) {
    console.error(e.response ? e.response.data : e.message);
  }
}
test();
