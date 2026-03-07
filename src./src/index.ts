import * as http from 'http';

console.log('🚀 Starting Flash Loan Bot...');

// Simple health check server
const server = http.createServer((req, res) => {
  console.log('📡 Received request:', req.url);
  
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'healthy',
      time: new Date().toISOString()
    }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

// Listen on ALL interfaces
server.listen(8080, '0.0.0.0', () => {
  console.log('✅ Health server running on port 8080');
  console.log('🌐 App is ready!');
});

// Handle errors
server.on('error', (err) => {
  console.error('❌ Server error:', err);
});

// Keep process alive
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down...');
  server.close();
});
