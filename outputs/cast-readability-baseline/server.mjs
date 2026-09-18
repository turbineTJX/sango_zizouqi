import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4173);
const url = `http://127.0.0.1:${port}`;
const openBrowser = () => {
  const args = process.platform === 'win32' ? ['cmd.exe', ['/c', 'start', '', url]] : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  const child = spawn(args[0], args[1], { windowsHide: true, stdio: 'ignore' });
  child.on('error', () => console.log(`请在浏览器打开 ${url}`));
};
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json' };
createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const path = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    const relative = path.slice(root.length + 1);
    if (!path.startsWith(root + sep) || relative.split(/[\\/]/).some(p => p.startsWith('.')) || !mime[extname(path)]) {
      res.writeHead(403); res.end('Forbidden'); return;
    }
    const data = await readFile(path);
    res.writeHead(200, { 'Content-Type': mime[extname(path)], 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    res.end(data);
  } catch { res.writeHead(404); res.end('Not found'); }
}).on('error', async error => {
  if (error.code === 'EADDRINUSE' && process.argv.includes('--open')) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if ((await response.text()).includes('三国 · 君临')) { openBrowser(); return; }
    } catch {}
  }
  console.error(error.code === 'EADDRINUSE' ? `端口 ${port} 已被占用，请设置 PORT 后重试。` : error.message);
  process.exitCode = 1;
}).listen(port, '127.0.0.1', () => {
  console.log(`三国 · 君临  ${url}`);
  if (process.argv.includes('--open')) openBrowser();
});
