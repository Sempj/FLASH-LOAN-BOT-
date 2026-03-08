const http = require('http');

const server = http.createServer((req, res) => {
  console.log('🔥 Request received at:', new Date().toISOString());
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('OK');
});

server.listen(8080, '0.0.0.0', () => {
  console.log('✅ SERVER IS RUNNING on 0.0.0.0:8080');
});

console.log('🚀 Booting up...');