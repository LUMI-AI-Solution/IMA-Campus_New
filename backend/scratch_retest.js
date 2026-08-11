const axios = require('axios');

async function test() {
    const payload = {
        object: "whatsapp_business_account",
        entry: [{
            id: "1040577271960244", // Business 6
            changes: [{
                value: {
                    messaging_product: "whatsapp",
                    metadata: { display_phone_number: "94712809030", phone_number_id: "354460024407519" },
                    contacts: [{ profile: { name: "Test User" }, wa_id: "94701234567" }],
                    messages: [{
                        from: "94701234567",
                        id: "wamid.HBgLOTQ3MDEyMzQ1NjcVAgASGCBBNTJERUNEMTEyMzQ1Njc=", // unique
                        timestamp: Math.floor(Date.now() / 1000).toString(),
                        text: { body: "Hi" },
                        type: "text"
                    }]
                }
            }]
        }]
    };
    
    try {
        console.log("Sending first Hi...");
        await axios.post('http://localhost:5000/api/coordinator-crm/webhook', payload);
        console.log("Waiting 10 seconds for AutoBot...");
        await new Promise(r => setTimeout(r, 10000));
        
        console.log("Sending second Hi...");
        payload.entry[0].changes[0].value.messages[0].id = "wamid.HBgLOTQ3MDEyMzQ1NjcVAgASGCBBNTJERUNEMTEyMzQ1Njg="; // new id
        payload.entry[0].changes[0].value.messages[0].timestamp = Math.floor(Date.now() / 1000).toString();
        await axios.post('http://localhost:5000/api/coordinator-crm/webhook', payload);
        console.log("Waiting 10 seconds for AutoBot...");
        await new Promise(r => setTimeout(r, 10000));
        
        console.log("Done.");
    } catch (e) {
        console.error(e.response ? e.response.data : e.message);
    }
}
test();
