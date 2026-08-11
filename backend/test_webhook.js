const axios = require('axios');
const payload = {
  object: 'whatsapp_business_account',
  entry: [{
    id: '1219197361279402',
    changes: [{
      value: {
        messaging_product: 'whatsapp',
        metadata: { display_phone_number: '1219197361279402', phone_number_id: '1219197361279402' },
        contacts: [{ profile: { name: 'TestUser' }, wa_id: '94714941559' }],
        messages: [{
          from: '94714941559',
          id: 'wamid.testmessage123',
          timestamp: Math.floor(Date.now() / 1000).toString(),
          type: 'text',
          text: { body: 'Yes' }
        }]
      },
      field: 'messages'
    }]
  }]
};

axios.post('http://localhost:5000/api/admin/crm/webhook', payload).then(r => console.log('Response:', r.data)).catch(e => console.error('Error:', e.response?.data || e.message));
