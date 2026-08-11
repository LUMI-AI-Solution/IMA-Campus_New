const axios = require('axios');

const ZOOM_ACCOUNTS = [
  { name: 'Account 1', accountId: 'sOOSu62kSAW4T-xL7B_pRw', clientId: 'jW7Xn7aRRlyvIXXYh_WnWg', clientSecret: 'kR6HwU6688Xv6l24n9j0v0bXz2vXN0Vl' }
];

async function test() {
  const acc = ZOOM_ACCOUNTS[0];
  const authHeader = 'Basic ' + Buffer.from(`${acc.clientId}:${acc.clientSecret}`).toString('base64');
  const tokenRes = await axios.post(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${acc.accountId}`, null, {
    headers: { 'Authorization': authHeader }
  });
  const token = tokenRes.data.access_token;
  
  const from = "2026-06-23";
  const to = "2026-06-24";
  
  try {
    const res = await axios.get(`https://api.zoom.us/v2/users/me/recordings?from=${from}&to=${to}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(JSON.stringify(res.data, null, 2));
  } catch (e) {
    console.log(e.response?.data || e.message);
  }
}
test();
