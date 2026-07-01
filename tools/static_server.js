const fs = require('fs');
const http = require('http');
const path = require('path');

const root = path.resolve(__dirname, '..');
const port = Number(process.argv[2] || process.env.PORT || 4173);

const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0] || '/');
  const normalized = decoded === '/' ? '/index.html' : decoded;
  const resolved = path.resolve(root, `.${normalized}`);
  return resolved === root || resolved.startsWith(`${root}${path.sep}`) ? resolved : null;
}

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'content-type': type });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const file = safePath(req.url || '/');
  if (!file) {
    send(res, 403, 'Forbidden');
    return;
  }

  fs.stat(file, (statErr, stat) => {
    if (statErr || !stat.isFile()) {
      send(res, 404, 'Not found');
      return;
    }

    res.writeHead(200, { 'content-type': types[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`HakoMachi test server listening on http://127.0.0.1:${port}`);
});
