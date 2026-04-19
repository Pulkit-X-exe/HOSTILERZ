const http = require('http');

const testRequest = (data) => {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(data);
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: '/api/fees/reminder',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => resolve({ statusCode: res.statusCode, body: JSON.parse(body) }));
        });

        req.on('error', (e) => reject(e));
        req.write(postData);
        req.end();
    });
};

async function runTests() {
    try {
        console.log("--- Testing Valid Roll Number (TEST001) ---");
        const res1 = await testRequest({ rollNo: 'TEST001' });
        console.log("Status:", res1.statusCode);
        console.log("Response:", res1.body);

        console.log("\n--- Testing Invalid Roll Number (INV-999) ---");
        const res2 = await testRequest({ rollNo: 'INV-999' });
        console.log("Status:", res2.statusCode);
        console.log("Response:", res2.body);
    } catch (err) {
        console.error("Test failed:", err);
    }
}

runTests();
