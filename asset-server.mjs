import {readFile,realpath} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const mime={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.glb':'model/gltf-binary','.obj':'text/plain; charset=utf-8','.json':'application/json; charset=utf-8','.html':'text/html; charset=utf-8'};
export async function serveAssets(pathname,res,root){
 if(!pathname.startsWith('/assets/'))return false;
 const tail=pathname.slice('/assets/'.length),headers={'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'};
 if(tail.split(/[\\/]/).some(part=>!part||part.startsWith('.'))||!mime[extname(tail)]){res.writeHead(403,headers);res.end('Forbidden');return true;}
 try{
  const base=await realpath(root),file=await realpath(resolve(base,tail));
  if(!file.startsWith(base+sep)){res.writeHead(403,headers);res.end('Forbidden');return true;}
  const bytes=await readFile(file);res.writeHead(200,{...headers,'Content-Type':mime[extname(file)]});res.end(bytes);
 }catch{res.writeHead(404,headers);res.end('Not found');}
 return true;
}
