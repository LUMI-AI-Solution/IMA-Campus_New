const axios = require('axios');

async function getSubscriptions() {
    const token = "EAAZAqcbObykgBSMrgTo4OfdOZAidmRro2bQHynFoGHaz7oKZBTofVOLsmWCTQb4NZBvCie8oJkVBiWmOWR3RIZBH0EAiyp6iEExrOTn61hi2H7hZB3gs2iAZCADEP5PnTroWZAwO786ZCNn2Fz7NVV1u6BdQLefBX2yK5RNqEyPMLXfZCw74uRgIiSPPU2vDmAtQZDZD";
    const appId = "1551166546399115";
    
    try {
        console.log(`Getting subscriptions for App ${appId}...`);
        const res = await axios.get(`https://graph.facebook.com/v20.0/${appId}/subscriptions`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("App subscriptions:", JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.error("Error GET:", e.response ? JSON.stringify(e.response.data, null, 2) : e.message);
    }
}
getSubscriptions();
