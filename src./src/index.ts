// SUPER SIMPLE TEST SERVER - COMPLETE VERSION
const http = require('http');

const server = http.createServer((req, res) => {
  console.log('✅ Request received at:', new Date().toISOString());
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('OK - Bot is running!');
});

server.listen(8080, '0.0.0.0', () => {
  console.log('✅ SERVER STARTED on 0.0.0.0:8080');
});

console.log('🚀 Booting up...');const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('OK');
});

server.listen(8080, '0.0.0.0', () => {
  console.log('✅ Server listening on 0.0.0.0:8080');
});

console.log('Starting...');
