import http from 'http';

const data = JSON.stringify({
  message: 'Hello Claude! Give me a 1-sentence welcome greeting for our space fruit puzzle game.'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/chat',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

console.log('Sending test request to http://localhost:3000/chat...');

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  res.on('end', () => {
    console.log(`Status Code: ${res.statusCode}`);
    try {
      const parsed = JSON.parse(body);
      console.log('Response:', JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('Raw Response:', body);
    }
  });
});

req.on('error', (error) => {
  console.error('Error during test request:', error.message);
  console.log('Tip: Make sure you ran the server first ("npm start" or "node server.js")!');
});

req.write(data);
req.end();
