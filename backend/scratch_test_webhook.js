const axios = require('axios');
const payload = {
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "1435924168573355",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "94712209030",
              "phone_number_id": "1189709874226544"
            },
            "contacts": [
              {
                "wa_id": "94771234567",
                "profile": { "name": "Test User" }
              }
            ],
            "messages": [
              {
                "from": "94771234567",
                "id": "wamid.testmessage123",
                "timestamp": "1782823137",
                "text": { "body": "test msg" },
                "type": "text"
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
  .then(res => console.log('Response:', res.status, res.data))
  .catch(err => console.error('Error:', err.message));
