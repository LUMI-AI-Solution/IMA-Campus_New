const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/admin/test-injector/inject-payment';
// Note: Ensure you have a valid token if verifyToken middleware requires it.
// If it requires a token, you'll need to grab one from your local storage / login and paste it here.
const TOKEN = 'YOUR_ADMIN_TOKEN_HERE'; 

async function injectPayment(phone, paymentType, typeName) {
    try {
        console.log(`\n===========================================`);
        console.log(`🚀 Testing: ${typeName} (Payment Type: ${paymentType}) for ${phone}`);
        console.log(`===========================================`);
        
        const payload = {
            phone: phone,
            businessId: 1, // Change if needed
            batchId: 1,    // Change if needed
            groupId: 1,    // Change if needed
            amount: paymentType === 3 ? 50000 : 5000, 
            payment_type: paymentType,
            subjects: "Maths,Science",
            customDate: new Date().toISOString()
        };

        const response = await axios.post(BASE_URL, payload, {
            headers: {
                // 'Authorization': `Bearer ${TOKEN}` // Uncomment if token is needed
            }
        });

        if (response.data.success) {
            console.log(`✅ Success! Payment Injected.`);
            console.log(`- Student ID: ${response.data.student.id}`);
            console.log(`- Payment ID: ${response.data.payment.id}`);
            console.log(`- Business Logic (syncLeadEnrollment) should now be triggered!`);
        } else {
            console.log(`❌ Failed:`, response.data.message);
        }
    } catch (error) {
        console.error(`❌ Request Error for ${typeName}:`, error.response?.data || error.message);
    }
}

async function runTests() {
    console.log("Starting Payment Injection CRM Logic Tests...\n");
    
    // 1. Test Monthly Payment (payment_type = 1)
    await injectPayment("94770000001", 1, "MONTHLY PAYMENT");
    
    // 2. Test Installment Upgrade (payment_type = 2)
    await injectPayment("94770000002", 2, "INSTALLMENT PAYMENT");
    
    // 3. Test Full Payment (payment_type = 3)
    await injectPayment("94770000003", 3, "FULL PAYMENT");
    
    console.log("\n🎉 All injection tests triggered. Please check the backend console to see 'syncLeadEnrollment' logs.");
}

runTests();
