import {readFile,realpath} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const mime={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.glb':'model/gltf-binary','.obj':'text/plain; charset=utf-8'};
export async function loadLocalArt(root,enabled=true){
 if(!enabled)return null;
 try{return JSON.parse(await readFile(resolve(root,'.local/art/manifest.json'),'utf8'));}catch{return null;}
}
export async function serveLocalArt(pathname,res,pack){
 if(!pathname.startsWith('/local-art/'))return false;
 const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 if(pathname==='/local-art/manifest.json'){
  res.writeHead(200,{...headers,'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(pack?.public||{version:1,id:'builtin',label:'默认图形'}));return true;
 }
 const id=pathname.slice('/local-art/files/'.length);
 if(!pathname.startsWith('/local-art/files/')||!Object.hasOwn(pack?.files||{},id)||!mime[extname(id)]){res.writeHead(404,headers);res.end('Not found');return true;}
 try{const bytes=await readFile(await realpath(pack.files[id]));res.writeHead(200,{...headers,'Content-Type':mime[extname(id)]});res.end(bytes);}catch{res.writeHead(404,headers);res.end('Not found');}
 return true;
}
