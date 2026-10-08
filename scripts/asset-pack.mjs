import {readFile,writeFile,mkdir,copyFile,realpath,stat} from 'node:fs/promises';
import {resolve,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {ASSET_ROOT,PROJECT_ROOT,assetFile} from '../asset-workspace.mjs';
import {sanitizeAssetCatalog,catalogAssetURLs,publicAssetURL} from '../asset-catalog.mjs';
import {sanitizeOfficerArt} from '../art-assets.mjs';

export async function validateAssetPack(root=ASSET_ROOT){
 const base=await realpath(root),catalogRaw=JSON.parse(await readFile(resolve(base,'manifest.json'),'utf8')),catalog=sanitizeAssetCatalog(catalogRaw);
 for(const name of ['art','terrains','foundations'])for(const [key,value] of Object.entries(catalogRaw.town?.[name]||{})){
  if(!Object.hasOwn(catalog.town[name],key)||(value!==''&&!publicAssetURL(value)))throw Error('Invalid town asset: '+name+'.'+key);
 }
 if(catalogRaw.officers&&!catalog.officers)throw Error('Invalid officer manifest URL');
 const files=new Map();
 const add=async(url,sha256)=>{
  const path=await realpath(assetFile(url,base));
  if(!path.startsWith(base+sep)||!(await stat(path)).isFile())throw Error('Asset leaves pack: '+url);
  if(sha256){
   if(!/^[a-f0-9]{64}$/.test(sha256)||createHash('sha256').update(await readFile(path)).digest('hex')!==sha256)throw Error('Asset hash mismatch: '+url);
  }
  files.set(url,path);
 };
 for(const url of catalogAssetURLs(catalogRaw))await add(url);
 let officers=null;
 if(catalog.officers){
  officers=JSON.parse(await readFile(files.get(catalog.officers),'utf8'));
  if(officers.version!==1||officers.id!=='original-officers')throw Error('Invalid officer manifest');
  const accepted=sanitizeOfficerArt(officers);
  for(const [id,scenes] of Object.entries(officers.officers||{}))for(const [scene,entry] of Object.entries(scenes)){
   if(!accepted[id]?.[scene]||!Number.isInteger(entry.width)||entry.width<=0||!Number.isInteger(entry.height)||entry.height<=0)throw Error('Invalid officer scene: '+id+':'+scene);
   await add(entry.url,entry.sha256);
  }
 }
 return {catalog,officers,files};
}
export async function bundleAssetPack(out,root=ASSET_ROOT){
 const pack=await validateAssetPack(root);
 // Only the public catalog and its declared runtime files cross this boundary.
 await mkdir(out,{recursive:true});
 for(const [url,source] of pack.files){
  const target=assetFile(url,resolve(out));await mkdir(dirname(target),{recursive:true});
  if(url===pack.catalog.officers)await writeFile(target,JSON.stringify(pack.officers,null,2)+'\n');
  else await copyFile(source,target);
 }
 await writeFile(resolve(out,'manifest.json'),JSON.stringify(pack.catalog,null,2)+'\n');
 await validateAssetPack(out);
 return pack;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [command='check',destination]=process.argv.slice(2);
 if(!['check','bundle'].includes(command))throw Error('Usage: asset-pack.mjs check | bundle [directory]');
 const out=command==='bundle'?resolve(destination||resolve(PROJECT_ROOT,'dist','art-'+Date.now())):null;
 const pack=out?await bundleAssetPack(out):await validateAssetPack();
 console.log(JSON.stringify({id:pack.catalog.id,revision:pack.catalog.revision,files:pack.files.size,...(out?{directory:out}:{root:ASSET_ROOT})},null,2));
}
