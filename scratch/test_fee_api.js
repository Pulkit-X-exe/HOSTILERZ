const axios = require('axios');

async function testApi() {
    const baseUrl = 'http://localhost:5000/api/fees/reminder';
    
    // 1. Test missing roll number
    try {
        console.log("Testing missing roll number...");
        await axios.post(baseUrl, {});
    } catch (error) {
        console.log("Expected Error (400):", error.response?.data?.message);
    }

    // 2. Test invalid roll number
    try {
        console.log("\nTesting invalid roll number...");
        await axios.post(baseUrl, { rollNo: 'NOT-EXIST' });
    } catch (error) {
        console.log("Expected Error (404):", error.response?.data?.message);
    }

    // 3. Test valid roll number (Assuming TEST001 exists from previous task)
    try {
        console.log("\nTesting valid roll number (TEST001)...");
        const res = await axios.post(baseUrl, { rollNo: 'TEST001' });
        console.log("Success:", res.data.message);
    } catch (error) {
        console.log("Error:", error.response?.data?.message || error.message);
    }
}

testApi();
