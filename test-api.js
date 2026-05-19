const http = require('http');

const data = JSON.stringify({ sessionName: 'session8' });

const options = {
  hostname: 'localhost',
  port: 6060,
  path: '/api/whatsapp/connect',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, (res) => {
  let responseBody = '';
  res.on('data', (chunk) => responseBody += chunk);
  res.on('end', () => console.log(`STATUS: ${res.statusCode}\nBODY: ${responseBody}`));
});

req.on('error', (e) => console.error(`problem with request: ${e.message}`));
req.write(data);
req.end();
