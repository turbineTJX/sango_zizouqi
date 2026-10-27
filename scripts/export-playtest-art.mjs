import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {sanitizePack} from '../art-assets.mjs';

export async function exportPlaytestArt(root,destination=resolve(root,'art/playtest')){
 const source=JSON.parse(await readFile(resolve(root,'.local/art/manifest.json'),'utf8'));
 const publicPack=sanitizePack(source.public),ids=new Set();
 if(publicPack.id==='builtin')throw Error('No imported playtest artwork');
 function collect(value){
  if(typeof value==='string'&&value.startsWith('/local-art/files/'))ids.add(value.slice('/local-art/files/'.length));
  else if(value&&typeof value==='object')for(const child of Object.values(value))collect(child);
 }
 collect(publicPack);
 const files={},sources={};let bytes=0;
 await mkdir(resolve(destination,'files'),{recursive:true});
 for(const id of [...ids].sort()){
  if(!/^[a-f0-9]{24}\.(?:png|jpe?g|webp|glb|obj)$/.test(id)||!Object.hasOwn(source.files||{},id))throw Error('Missing playtest asset: '+id);
  const content=await readFile(source.files[id]);
  const sha256=createHash('sha256').update(content).digest('hex');
  if(sha256.slice(0,24)!==id.split('.')[0]||source.sources?.[id]?.sha256&&source.sources[id].sha256!==sha256)throw Error('Playtest asset hash mismatch: '+id);
  await writeFile(resolve(destination,'files',id),content);
  files[id]='files/'+id;
  sources[id]={source:source.sources?.[id]?.source||'imported-playtest',sha256,bytes:content.length};
  bytes+=content.length;
 }
 const manifest={formatVersion:1,public:publicPack,files,sources};
 await writeFile(resolve(destination,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 return {files:ids.size,bytes,portraits:Object.keys(publicPack.portraits).length};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
 console.log(JSON.stringify(await exportPlaytestArt(root),null,2));
}
