const axios = require('axios');
async function test() {
    const payload = {
        object: 'whatsapp_business_account',
        entry: [{
            id: '1072963135173172',
            changes: [{
                value: {
                    messaging_product: 'whatsapp',
                    metadata: { display_phone_number: '1178123275395170', phone_number_id: '1178123275395170' },
                    contacts: [{ profile: { name: 'Test User' }, wa_id: '94701234567' }],
                    messages: [{
                        from: '94701234567',
                        id: 'wamid.HBgLOTQ3NjM4NDMzMzUVAgASGDdBMTEwNTc3OEM4Rjc5NjczRTExRUFGRDFCRTk1Q0JEAA==',
                        timestamp: '1690000000',
                        type: 'text',
                        text: { body: 'Yes' }
                    }]
                },
                field: 'messages'
            }]
        }]
    };
    try {
        const res = await axios.post('http://localhost:5000/api/meta/webhook', payload);
        console.log("RESPONSE:", res.data);
    } catch(e) { console.error(e.response?.data || e.message); }
}
test();
