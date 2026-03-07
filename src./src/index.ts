import * as http from 'http';

console.log('🚀 STARTING BOT...');
console.log('Environment check:');
console.log('- PRIVATE_KEY:', process.env.PRIVATE_KEY ? '✅ Set' : '❌ Missing');

// Create server IMMEDIATELY
const server = http.createServer((req, res) => {
  console.log('📡 Request received:', req.url);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    status: 'ok',
    message: 'Bot is running',
    time: new Date().toISOString()
  }));
});

// Listen on ALL interfaces
server.listen(8080, '0.0.0.0', () => {
  console.log('✅ SUCCESS! Server is listening on 0.0.0.0:8080');
  console.log('🌐 Visit: https://flash-loan-bot-sempj71.fly.dev/health');
});

// Handle errors
server.on('error', (err) => {
  console.error('❌ Server error:', err);
});

// Keep alive
console.log('⏳ Waiting for requests...');
