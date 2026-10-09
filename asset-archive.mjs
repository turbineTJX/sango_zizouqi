// Node-only adapter: retain the public /assets/ contract when art is one archive.
import {readFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';

const cache=new Map(),MAX_BYTES=512*1024*1024;
export const archiveDigest=bytes=>createHash('sha256').update(bytes).digest('hex');
export function validateArchiveEntries(entries){
 const indexBytes=entries['pack-index.json'];if(!indexBytes)throw Error('Art pack index is missing');
 const index=JSON.parse(Buffer.from(indexBytes).toString('utf8'));
 if(index.formatVersion!==1||!Array.isArray(index.files)||index.files.length>20000)throw Error('Invalid art pack index');
 const paths=new Set(),files=new Map();let size=0;
 for(const file of index.files){
  if(typeof file.path!=='string'||!/^([A-Za-z0-9_-]+\/)*[A-Za-z0-9_-][A-Za-z0-9_.-]*\.(json|png|jpe?g|webp|svg|glb|obj)$/.test(file.path)||paths.has(file.path))throw Error('Invalid art pack path');
  paths.add(file.path);const bytes=entries[file.path];
  if(!bytes||bytes.byteLength!==file.bytes||archiveDigest(bytes)!==file.sha256)throw Error('Art pack file checksum mismatch: '+file.path);
  size+=bytes.length;if(size>MAX_BYTES)throw Error('Art pack exceeds the runtime limit');files.set(file.path,bytes);
 }
 if(Object.keys(entries).some(path=>path!=='pack-index.json'&&!paths.has(path)))throw Error('Undeclared art pack entry');
 if(!files.has('manifest.json'))throw Error('Art catalog is missing');
 return {index,files};
}

export async function readAssetArchive(root){
 const path=resolve(root,'art.pack');let info;
 try{info=await stat(path);}catch(error){if(error.code==='ENOENT')return null;throw error;}
 if(info.size>MAX_BYTES)throw Error('Art pack exceeds the runtime limit');
 const key=info.size+':'+info.mtimeMs;
 if(cache.get(path)?.key===key)return cache.get(path).pack;
 const {unzipSync}=await import('fflate');
 let total=0,count=0;
 const bytes=await readFile(path),entries=unzipSync(bytes,{filter:file=>{
  total+=file.originalSize;count++;
  if(total>MAX_BYTES||count>20001)throw Error('Art entries exceed the runtime limit');return true;
 }});
 const pack=validateArchiveEntries(entries);cache.set(path,{key,pack});return pack;
}
