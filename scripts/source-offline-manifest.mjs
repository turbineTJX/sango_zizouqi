import {build} from 'esbuild';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,relative,dirname} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

export const SOURCE_OFFLINE_FILE='source-offline-files.js';
const sha=value=>createHash('sha256').update(value).digest('hex');
export async function sourceOfflineManifest(root){
 root=resolve(root);
 const html=await readFile(resolve(root,'index.html'),'utf8');
 const importMap=JSON.parse(html.match(/<script\s+type="importmap">([\s\S]*?)<\/script>/)?.[1]||'{"imports":{}}').imports;
 const alias=Object.fromEntries(Object.entries(importMap).filter(([,path])=>path.startsWith('.')).map(([name,path])=>[name,resolve(root,path)]));
 const links=[...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/g)].map(m=>m[1]).filter(path=>!/^\w+:|^\/\/|^#/.test(path));
 const scripts=links.filter(path=>/\.(?:mjs|js)$/.test(path)),styles=links.filter(path=>path.endsWith('.css'));
 const inputs=new Set(['index.html','sw.js',...links.map(path=>relative(root,resolve(root,path)).replaceAll('\\','/'))]);
 for(const paths of [scripts,styles]){
  if(!paths.length)continue;
  const result=await build({absWorkingDir:root,entryPoints:paths,bundle:true,write:false,metafile:true,logLevel:'silent',platform:'browser',format:'esm',outdir:resolve(root,'.offline-output'),alias,
   external:['@capacitor/*'],loader:{'.svg':'file','.png':'file','.webp':'file','.woff2':'file'}});
  for(const path of Object.keys(result.metafile.inputs)){
   const name=relative(root,resolve(root,path)).replaceAll('\\','/');
   if(name.startsWith('../')||name.startsWith('node_modules/')||name.startsWith('assets/'))throw Error('源码离线依赖无法直接发布：'+name);
   inputs.add(name);
  }
 }
 const manifest=JSON.parse(await readFile(resolve(root,'manifest.webmanifest'),'utf8'));
 for(const icon of manifest.icons||[])inputs.add(relative(root,resolve(root,icon.src)).replaceAll('\\','/'));
 const hashes={};for(const file of [...inputs].sort())hashes[file]=sha(await readFile(resolve(root,file)));
 const revision=sha(JSON.stringify(hashes));
 const files=['./',...Object.keys(hashes).filter(path=>path!=='sw.js').map(path=>'./'+path),'./'+SOURCE_OFFLINE_FILE];
 return {version:1,revision,files,hashes};
}
export async function writeSourceOfflineManifest(root,{check=false}={}){
 const manifest=await sourceOfflineManifest(root),path=resolve(root,SOURCE_OFFLINE_FILE);
 const content='// Generated from the actual HTML, JavaScript and CSS dependency graph.\nself.SANGO_SOURCE_OFFLINE = '+JSON.stringify(manifest,null,2)+';\n';
 let current;try{current=await readFile(path,'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
 if(current!==content){if(check)throw Error('源码离线清单已过期，请运行 npm run offline:generate');await writeFile(path,content);}
 return manifest;
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
 const manifest=await writeSourceOfflineManifest(root,{check:process.argv.includes('--check')});
 console.log(`Source offline dependencies passed: ${manifest.files.length} files, ${manifest.revision}`);
}
