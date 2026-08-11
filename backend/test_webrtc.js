const axios = require('axios');
async function test() {
  const payload = {
    object: 'whatsapp_business_account',
    entry: [{
      id: '1300483631920730', // Business 1 (waNumId 1261511497040632)
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: {
            display_phone_number: '94760159030',
            phone_number_id: '1261511497040632'
          },
          messages: [{
            from: '94760159030', // caller phone (testing)
            id: 'test_msg_123',
            type: 'webrtc',
            webrtc: {
              call_id: 'test_call_' + Date.now(),
              action: 'offer',
              sdp: 'dummy_sdp'
            }
          }]
        },
        field: 'messages'
      }]
    }]
  };
  try {
    const res = await axios.post('http://localhost:5000/api/admin/whatsapp-call/webhook', payload);
    console.log('Success:', res.data);
  } catch (err) {
    console.log('Error:', err.message);
  }
}
test();
