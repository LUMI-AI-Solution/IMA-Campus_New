const axios = require('axios');

async function getCalling() {
    const token = "EAAZAqcbObykgBSMrgTo4OfdOZAidmRro2bQHynFoGHaz7oKZBTofVOLsmWCTQb4NZBvCie8oJkVBiWmOWR3RIZBH0EAiyp6iEExrOTn61hi2H7hZB3gs2iAZCADEP5PnTroWZAwO786ZCNn2Fz7NVV1u6BdQLefBX2yK5RNqEyPMLXfZCw74uRgIiSPPU2vDmAtQZDZD";
    const phoneId = "1208424262355917";
    const wabaId = "1478042197693029";
    
    try {
        console.log(`Getting config for Phone ${phoneId}...`);
        let res = await axios.get(`https://graph.facebook.com/v20.0/${phoneId}?fields=platform_type,webhook_configuration`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Phone config:", JSON.stringify(res.data, null, 2));
        
        console.log(`Getting subscribed apps for WABA ${wabaId}...`);
        res = await axios.get(`https://graph.facebook.com/v20.0/${wabaId}/subscribed_apps`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("WABA subscribed apps:", JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.error("Error GET:", e.response ? JSON.stringify(e.response.data, null, 2) : e.message);
    }
}
getCalling();
