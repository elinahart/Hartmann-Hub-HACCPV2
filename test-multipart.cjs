const http = require('http');

const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
const data = '--' + boundary + '\r\n' +
    'Content-Disposition: form-data; name="file"; filename="test.zip"\r\n' +
    'Content-Type: application/zip\r\n\r\n' +
    'file data\r\n' +
    '--' + boundary + '--\r\n';

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/sessions/test/upload',
  method: 'POST',
  headers: {
    'Content-Type': 'multipart/form-data; boundary=' + boundary,
    'Content-Length': Buffer.byteLength(data)
  }
}, (res) => {
  console.log('STATUS:', res.statusCode);
  console.log('HEADERS:', res.headers);
  res.on('data', (d) => {
    process.stdout.write(d);
  });
});

req.on('error', (e) => {
  console.error(e);
});
req.write(data);
req.end();
