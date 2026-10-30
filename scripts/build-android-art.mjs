import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {sha256} from './release-lib.mjs';

// Both containers expose the same approved files at the existing public URLs.
export async function buildAndroidArt(source,webRoot,art){
 const files={};
 const record=(path,bytes)=>{files[path]={bytes:bytes.length,sha256:sha256(bytes)};};
 for(const [path,entry]of Object.entries(art.files)){
  if(path==='playtest/manifest.json')continue;
  const target=path.startsWith('playtest/files/')?'local-art/'+path.slice('playtest/'.length):'assets/'+path;
  const bytes=await readFile(join(source,path));
  if(bytes.length!==entry.bytes||sha256(bytes)!==entry.sha256)throw Error('Android artwork checksum mismatch: '+path);
  await mkdir(dirname(join(webRoot,target)),{recursive:true});await copyFile(join(source,path),join(webRoot,target));record(target,bytes);
 }
 const playtestBytes=await readFile(join(source,'playtest/manifest.json')),entry=art.files['playtest/manifest.json'];
 if(playtestBytes.length!==entry.bytes||sha256(playtestBytes)!==entry.sha256)throw Error('Android playtest manifest checksum mismatch');
 const playtest=JSON.parse(playtestBytes);
 for(const [path,value]of Object.entries({'local-art/manifest.json':playtest.public,'local-art/sources.json':playtest.sources})){
  const bytes=Buffer.from(JSON.stringify(value,null,2)+'\n');await mkdir(dirname(join(webRoot,path)),{recursive:true});await writeFile(join(webRoot,path),bytes);record(path,bytes);
 }
 return files;
}
