import {readFile,writeFile,copyFile,mkdir,realpath} from 'node:fs/promises';
import {join,dirname,resolve,sep} from 'node:path';
import {bundleAssetPack} from './asset-pack.mjs';
import {PROJECT_ROOT} from '../asset-workspace.mjs';
import {archiveDigest} from '../asset-archive.mjs';
import {loadPlaytestArt} from '../local-art-server.mjs';

export async function buildDesktopArt(destination,{assetRoot,playtestRoot=join(PROJECT_ROOT,'art/playtest')}={}){
 const approved=await bundleAssetPack(destination,assetRoot),files={};
 const record=async path=>{const bytes=await readFile(join(destination,path));files[path]={bytes:bytes.length,sha256:archiveDigest(bytes)};};
 await record('manifest.json');
 for(const url of approved.files.keys())await record(url.slice('./assets/'.length));
 const playtest=await loadPlaytestArt(playtestRoot);
 if(!playtest)throw Error('The declared playtest artwork manifest is missing or invalid');
 const base=await realpath(playtestRoot);
 for(const [id,source]of Object.entries(playtest.files)){
  const path=await realpath(source),metadata=playtest.sources?.[id];
  if(!path.startsWith(base+sep)||!metadata?.source||!metadata.sha256)throw Error('Invalid playtest artwork source: '+id);
  const bytes=await readFile(path);
  if(bytes.length!==metadata.bytes||archiveDigest(bytes)!==metadata.sha256)throw Error('Playtest artwork checksum mismatch: '+id);
  const relative='playtest/files/'+id,target=resolve(destination,relative);await mkdir(dirname(target),{recursive:true});await copyFile(path,target);await record(relative);
 }
 const manifest={formatVersion:1,public:playtest.public,files:Object.fromEntries(Object.keys(playtest.files).map(id=>[id,'files/'+id])),sources:playtest.sources};
 await writeFile(join(destination,'playtest/manifest.json'),JSON.stringify(manifest,null,2)+'\n');await record('playtest/manifest.json');
 return {format:'directory',id:approved.catalog.id,revision:approved.catalog.revision,sha256:archiveDigest(Buffer.from(JSON.stringify(files))),bytes:Object.values(files).reduce((n,f)=>n+f.bytes,0),playtestFiles:Object.keys(playtest.files).length,files};
}
