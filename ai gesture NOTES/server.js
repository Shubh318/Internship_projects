const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

// Explicit MIME types required for WebAssembly and assets to compile correctly in the browser
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.wasm': 'application/wasm', // CRITICAL for WebAssembly compilation
  '.data': 'application/octet-stream',
  '.tflite': 'application/octet-stream',
  '.txt': 'text/plain',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // Simple request logger
  console.log(`${new Date().toLocaleTimeString()} - ${req.method} ${req.url}`);
  
  // Resolve filepath (default to index.html for root requests)
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  
  // Security check: prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  // Check if file exists and stream it
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Access-Control-Allow-Origin': '*' // Enable CORS
    });

    const stream = fs.createReadStream(filePath);
    stream.on('error', (streamErr) => {
      console.error('File stream error:', streamErr);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Internal Server Error');
      }
    });
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`Air Writing Notes App - Secure Web Server Running!`);
  console.log(`Local URL: http://localhost:${PORT}`);
  console.log(`===================================================`);
  console.log(`Serving files from: ${__dirname}`);
});
