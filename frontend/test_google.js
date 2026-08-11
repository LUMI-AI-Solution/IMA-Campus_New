const axios = require('axios');
async function test() {
    try {
        const res = await axios.get('https://inputtools.google.com/request?text=amma&itc=si-t-i0-und&num=5&cp=0&cs=1&ie=utf-8&oe=utf-8');
        console.log(JSON.stringify(res.data, null, 2));
    } catch(e) {
        console.error(e.message);
    }
}
test();
