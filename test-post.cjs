const http = require('http');

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/sessions/test1234/upload',
  method: 'POST'
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
req.end();
