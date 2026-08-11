const axios = require('axios');

async function subscribeWaba() {
    const token = "EAAZAqcbObykgBSMrgTo4OfdOZAidmRro2bQHynFoGHaz7oKZBTofVOLsmWCTQb4NZBvCie8oJkVBiWmOWR3RIZBH0EAiyp6iEExrOTn61hi2H7hZB3gs2iAZCADEP5PnTroWZAwO786ZCNn2Fz7NVV1u6BdQLefBX2yK5RNqEyPMLXfZCw74uRgIiSPPU2vDmAtQZDZD";
    const wabaId = "1478042197693029";
    
    try {
        console.log(`Subscribing WABA ${wabaId} to the new App...`);
        const res = await axios.post(`https://graph.facebook.com/v20.0/${wabaId}/subscribed_apps`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Success POST:", res.data);
    } catch (e) {
        console.error("Error POST:", e.response ? JSON.stringify(e.response.data, null, 2) : e.message);
    }
}
subscribeWaba();
