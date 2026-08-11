const axios = require('axios');
const ZOOM_ACCOUNTS = [
  { name: "Acc 01", accountId: "nsKzuoSbQLqeEKFO25W3QA", clientId: "Lzn79CR2W2LLKVAm9thw", clientSecret: "cs0qQYhl3HVKRh9liOmA8SNz3217njHY" },
  { name: "Acc 02", accountId: "nsKzuoSbQLqeEKFO25W3QA", clientId: "zdp67ASFQ8yp4Y6YXBB20Q", clientSecret: "YAA1RWgc9pEq7QMhKYc2xhYITNkcDQ3K" },
  { name: "Acc 03", accountId: "nsKzuoSbQLqeEKFO25W3QA", clientId: "NY0LYloxTZGhwi2l0pcpTQ", clientSecret: "A898Z1ZJsebK6uY3Pf5TRbxgo0JPpOSv" },
  { name: "Acc 04", accountId: "nsKzuoSbQLqeEKFO25W3QA", clientId: "iU2c7XYURSyY_yIySVEuVg", clientSecret: "KXHh0mXb0KMJ5PqCN4n7OBbEnhXCTQ08" },
  { name: "Acc 05", accountId: "nsKzuoSbQLqeEKFO25W3QA", clientId: "gKXNiK2jT42W2pkP11ncAg", clientSecret: "PtVybT7aA4wNQELTJMhL63awUOFv9dpn" },
  { name: "Acc 06", accountId: "nsKzuoSbQLqeEKFO25W3QA", clientId: "jheRyAaOQ0ugGeWjoYvQFQ", clientSecret: "GuYPH13R0eJnkqkWRZX8nAC1iC8IWp8z" },
  { name: "Acc 07", accountId: "nsKzuoSbQLqeEKFO25W3QA", clientId: "I1ko4YsDTUCpGrcobIfFrA", clientSecret: "NKKghbWe5t2PX95Dov3xpq1G58lvkEj7" },
  { name: "Acc 08", accountId: "nsKzuoSbQLqeEKFO25W3QA", clientId: "Cv5XlndDTVKNY6v_pYg37g", clientSecret: "H1TNcXkr4SENQ3236jFIyzAnctA19dYZ" }
];

async function getZoomToken(accountId, clientId, clientSecret) {
  const tokenUrl = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`;
  const authHeader = 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await axios.post(tokenUrl, {}, { headers: { 'Authorization': authHeader } });
  return response.data.access_token;
}

async function test() {
  for (const acc of ZOOM_ACCOUNTS) {
    const token = await getZoomToken(acc.accountId, acc.clientId, acc.clientSecret);
    try {
      const encodedId = encodeURIComponent('qKOpRjZuIWMJzVi0r5ZmlVm1V4L9uSM937KdWoIlOeiiD75wfsnKzncl-6Fqiqm7.Fo6gz9bRx0jqSlqn');
      const res2 = await axios.get(`https://api.zoom.us/v2/meetings/${encodedId}/recordings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log(`Found in ${acc.name}!`);
      return;
    } catch (e) {
      // ignore
    }
  }
  console.log('Not found in any account.');
}
test();
