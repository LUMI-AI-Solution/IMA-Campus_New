const axios = require('axios');

async function debugToken() {
    const token = "EAAZAqcbObykgBSMrgTo4OfdOZAidmRro2bQHynFoGHaz7oKZBTofVOLsmWCTQb4NZBvCie8oJkVBiWmOWR3RIZBH0EAiyp6iEExrOTn61hi2H7hZB3gs2iAZCADEP5PnTroWZAwO786ZCNn2Fz7NVV1u6BdQLefBX2yK5RNqEyPMLXfZCw74uRgIiSPPU2vDmAtQZDZD";
    
    try {
        const res = await axios.get(`https://graph.facebook.com/debug_token?input_token=${token}&access_token=${token}`);
        console.log("Token info:", JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.error("Error GET:", e.response ? JSON.stringify(e.response.data, null, 2) : e.message);
    }
}
debugToken();
