// Local, read-only source server on an isolated origin. No live-save migration.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,dirname,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {serveAssets} from '../asset-server.mjs';
import {ASSET_ROOT} from '../asset-workspace.mjs';
import {loadLocalArt,serveLocalArt} from '../local-art-server.mjs';
const args=Object.fromEntries(process.argv.slice(2).map(a=>a.replace(/^--/,'').split('=')));
const repo=resolve(dirname(fileURLToPath(import.meta.url)),'..'),root=resolve(args.runtime||'work/battle-roles-prototype/window-v3/runtime');
const playRoot=resolve(args.playRoot||'work/battle-roles-prototype');
const port=Number(args.port||4348),localArt=await loadLocalArt(repo);
const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.bin':'application/octet-stream','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp'};
createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(['/play.html','/report.html','/analysis.json','/comparison.png'].includes(pathname)||/^\/demos\/[a-z0-9-]+\.json$/.test(pathname)){
   const file=resolve(playRoot,'.'+pathname);res.writeHead(200,{'Content-Type':mime[extname(file)],'Cache-Control':'no-store'});res.end(await readFile(file));return;
  }
  if(pathname==='/sw.js'){res.writeHead(404);res.end();return;}
  if(await serveAssets(pathname,res,ASSET_ROOT,req.headers)||await serveLocalArt(pathname,res,localArt))return;
  const staticRoot=pathname.startsWith('/vendor/')||['/icon.svg','/manifest.webmanifest'].includes(pathname)?repo:root;
  const path=resolve(staticRoot,'.'+(pathname==='/'?'/index.html':pathname));
  if(!path.startsWith(staticRoot+sep)||pathname.split('/').some(p=>p.startsWith('.'))||!mime[extname(path)]){res.writeHead(403);res.end();return;}
  let body=await readFile(path);
  if(pathname==='/'||pathname==='/index.html')body=Buffer.from(body.toString().replace('<title>','<title>三层分工试验版 · '));
  res.writeHead(200,{'Content-Type':mime[extname(path)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(body);
 }catch{res.writeHead(404);res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log('三层分工试验版 http://127.0.0.1:'+port));
