import {readFile,realpath,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {readAssetArchive} from './asset-archive.mjs';
const mime={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.glb':'model/gltf-binary','.obj':'text/plain; charset=utf-8','.json':'application/json; charset=utf-8','.html':'text/html; charset=utf-8','.ogg':'audio/ogg','.wav':'audio/wav','.mp3':'audio/mpeg'};
const requestHeader=(headers,name)=>headers.get?.(name)||headers[name];
function unchanged(headers,etag,modified){
 const match=requestHeader(headers,'if-none-match');
 if(match)return match.split(',').some(value=>value.trim()==='*'||value.trim().replace(/^W\//,'')===etag.replace(/^W\//,''));
 const since=requestHeader(headers,'if-modified-since');return !!since&&modified!==undefined&&modified<=Date.parse(since);
}
export async function serveAssets(pathname,res,root,requestHeaders={}){
 if(!pathname.startsWith('/assets/'))return false;
 const tail=pathname.slice('/assets/'.length),headers={'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'};
 if(tail.split(/[\\/]/).some(part=>!part||part.startsWith('.'))||!mime[extname(tail)]){res.writeHead(403,headers);res.end('Forbidden');return true;}
 try{
  const archive=await readAssetArchive(root);
  if(archive){
   const bytes=archive.files.get(tail);if(!bytes){res.writeHead(404,headers);res.end('Not found');return true;}
   const etag='"'+archive.checksums.get(tail)+'"',metadata={...headers,ETag:etag,'Content-Type':mime[extname(tail)]};
   if(unchanged(requestHeaders,etag)){res.writeHead(304,metadata);res.end();return true;}
   res.writeHead(200,metadata);res.end(Buffer.from(bytes.buffer,bytes.byteOffset,bytes.byteLength));return true;
  }
  const base=await realpath(root),file=await realpath(resolve(base,tail));
  if(!file.startsWith(base+sep)){res.writeHead(403,headers);res.end('Forbidden');return true;}
  const info=await stat(file),etag=`W/"${info.size.toString(16)}-${info.mtimeMs.toString(16)}-${info.ctimeMs.toString(16)}"`;
  const metadata={...headers,'Content-Type':mime[extname(file)],ETag:etag,'Last-Modified':info.mtime.toUTCString()};
  if(unchanged(requestHeaders,etag,info.mtimeMs)){res.writeHead(304,metadata);res.end();return true;}
  const bytes=await readFile(file);res.writeHead(200,metadata);res.end(bytes);
 }catch{res.writeHead(404,headers);res.end('Not found');}
 return true;
}
