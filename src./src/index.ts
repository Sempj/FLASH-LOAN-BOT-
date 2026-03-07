import * as http from 'http';

console.log('🚀 Starting Flash Loan Bot...');
console.log('Listening on 0.0.0.0:8080');

const server = http.createServer((req, res) => {
  console.log('📡 Request received:', req.url);
  
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'healthy',
      port: 8080,
      time: new Date().toISOString()
    }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

// CRITICAL FIX: Listen on ALL interfaces (0.0.0.0) not just localhost
server.listen(8080, '0.0.0.0', () => {
  console.log('✅ Server is RUNNING on 0.0.0.0:8080');
  console.log('🌐 Ready for health checks!');
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
});

// Keep alive
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  server.close();
});
