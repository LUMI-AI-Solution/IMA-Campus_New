const axios = require('axios');
const payload = {
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "1559030702438308",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "94771234567",
              "phone_number_id": "1266389426549974"
            },
            "calls": [
              {
                "event": "connect",
                "id": "FAKE_CALL_ID_123456",
                "from": "94770000000",
                "session": {
                  "sdp": "fake_sdp",
                  "sdp_type": "offer"
                }
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
};

axios.post('http://localhost:5000/api/coordinator-crm/webhook', payload)
  .then(res => console.log('Webhook sent:', res.status))
  .catch(err => console.error('Error:', err.message));
