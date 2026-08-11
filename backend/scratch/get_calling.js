const axios = require('axios');

async function getCalling() {
    const token = "EAAZAqcbObykgBSMrgTo4OfdOZAidmRro2bQHynFoGHaz7oKZBTofVOLsmWCTQb4NZBvCie8oJkVBiWmOWR3RIZBH0EAiyp6iEExrOTn61hi2H7hZB3gs2iAZCADEP5PnTroWZAwO786ZCNn2Fz7NVV1u6BdQLefBX2yK5RNqEyPMLXfZCw74uRgIiSPPU2vDmAtQZDZD";
    const phoneId = "1208424262355917";
    
    try {
        console.log(`Getting calling config for ${phoneId}...`);
        const res = await axios.get(`https://graph.facebook.com/v20.0/${phoneId}?fields=platform_type`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Success GET:", res.data);
    } catch (e) {
        console.error("Error GET:", e.response ? JSON.stringify(e.response.data, null, 2) : e.message);
    }
}
getCalling();
