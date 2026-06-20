const axios = require('axios');
async function test() {
    const res = await axios.get('http://localhost:5000/api/admin/bank-transactions?statementMonth=May-2026');
    console.log("Headers:", res.data.headers);
    console.log("Rows[0]:", res.data.rows[0]);
}
test().catch(console.error);
