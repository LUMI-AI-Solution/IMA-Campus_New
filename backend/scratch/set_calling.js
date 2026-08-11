const axios = require('axios');

async function setCalling() {
    const token = "EAAZAqcbObykgBSMrgTo4OfdOZAidmRro2bQHynFoGHaz7oKZBTofVOLsmWCTQb4NZBvCie8oJkVBiWmOWR3RIZBH0EAiyp6iEExrOTn61hi2H7hZB3gs2iAZCADEP5PnTroWZAwO786ZCNn2Fz7NVV1u6BdQLefBX2yK5RNqEyPMLXfZCw74uRgIiSPPU2vDmAtQZDZD";
    const phoneId = "1208424262355917";
    
    try {
        console.log(`Setting calling config for ${phoneId}...`);
        const res = await axios.post(`https://graph.facebook.com/v20.0/${phoneId}`, {
            platform_type: "WEBHOOK"
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Success:", res.data);
    } catch (e) {
        console.error("Error:", e.response ? JSON.stringify(e.response.data, null, 2) : e.message);
    }
}
setCalling();
