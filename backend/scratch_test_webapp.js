const axios = require('axios');
async function test() {
    const webAppUrl = 'https://script.google.com/macros/s/AKfycbwKgZoSnC0FhT2a02mRXdPEXqb0y2Y_v7Z4PYsILkdImH02q79YMHeYGYOLqxbc631_EQ/exec';
    const rowData = ['4-May-26','628000000000','CRDLESDEP 0000761430037 AECM','1,700.00','Verified','AI System','N/A','N/A','N/A','N/A'];
    const matchedRowIndex = 2;
    const endColLetter = String.fromCharCode(65 + rowData.length - 1);
    const postData = {
        secret: "IMA_SECURE_TOKEN_2026",
        range: `A${matchedRowIndex}:${endColLetter}${matchedRowIndex}`,
        values: rowData
    };
    try {
        console.log("Sending to Web App (JSON):", postData);
        let resApp = await axios.post(webAppUrl, postData);
        console.log('Web App Response (JSON):', resApp.data);
    } catch(e) {
        console.error("JSON Error:", e.message);
    }
    
    try {
        console.log("Sending to Web App (text/plain):", postData);
        let resApp = await axios.post(webAppUrl, postData, {
            headers: { 'Content-Type': 'text/plain' }
        });
        console.log('Web App Response (text/plain):', resApp.data);
    } catch(e) {
        console.error("text/plain Error:", e.message);
    }
}
test();
