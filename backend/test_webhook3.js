const axios = require('axios');
const payload = {
  object: 'whatsapp_business_account',
  entry: [{
    id: '1300483631920730',
    changes: [{
      value: {
        messaging_product: 'whatsapp',
        metadata: { display_phone_number: '94707829030', phone_number_id: '1178123275395170' },
        contacts: [{ profile: { name: 'TestUser' }, wa_id: '94714941559' }],
        messages: [{
          from: '94714941559',
          id: 'wamid.testmessage123456789',
          timestamp: Math.floor(Date.now() / 1000).toString(),
          type: 'text',
          text: { body: 'Yes' }
        }]
      },
      field: 'messages'
    }]
  }]
};

axios.post('http://localhost:5000/api/after-seminar-crm/webhook', payload).then(r => console.log('Response:', r.data)).catch(e => console.error('Error:', e.response?.data || e.message));
