import http from 'http';

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Hello World');
});

server.on('error', (error) => {
  console.error('Server error:', error);
});

server.listen(3000, '127.0.0.1', () => {
  console.log('Server running on 127.0.0.1:3000');
});