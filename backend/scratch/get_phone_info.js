const axios = require('axios');

async function getPhoneInfo() {
    const token = "EAAZAqcbObykgBSMrgTo4OfdOZAidmRro2bQHynFoGHaz7oKZBTofVOLsmWCTQb4NZBvCie8oJkVBiWmOWR3RIZBH0EAiyp6iEExrOTn61hi2H7hZB3gs2iAZCADEP5PnTroWZAwO786ZCNn2Fz7NVV1u6BdQLefBX2yK5RNqEyPMLXfZCw74uRgIiSPPU2vDmAtQZDZD";
    const phoneId = "1208424262355917";
    
    try {
        const res = await axios.get(`https://graph.facebook.com/v20.0/${phoneId}?fields=messaging_limit_tier,status,quality_rating`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Phone config:", JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.error("Error GET:", e.response ? JSON.stringify(e.response.data, null, 2) : e.message);
    }
}
getPhoneInfo();
