import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {OFFICER_CATALOG,OFFICER_BY_ID} from '../officer-catalog.mjs';
import {OFFICER_ASSET_ROOT} from '../asset-workspace.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export function resolveLegacyFaceReference(pack,id){
 const url=pack?.public?.portraits?.[id],key=typeof url==='string'?url.match(/^\/local-art\/files\/([a-f0-9]{24}\.(?:png|jpe?g|webp))$/)?.[1]:null,file=key&&pack.files?.[key];
 if(typeof file!=='string'||!isAbsolute(file))return null;
 const sharedWith=Object.entries(pack.public.portraits).filter(([other,value])=>other!==id&&value===url).map(([other])=>other);
 return {officerId:id,file,source:'existing-local-officer-portrait',localOnly:true,sharedWith};
}
export async function legacyFaceReferences(ids){
 let pack;try{pack=JSON.parse(await readFile(resolve(root,'.local/art/manifest.json'),'utf8'));}catch(e){if(e.code==='ENOENT')return {};throw e;}
 const refs={};for(const id of ids){if(!OFFICER_BY_ID[id])continue;const ref=resolveLegacyFaceReference(pack,id);if(!ref)continue;try{const bytes=await readFile(ref.file);refs[id]={...ref,sha256:createHash('sha256').update(bytes).digest('hex')};}catch(e){if(e.code!=='ENOENT')throw e;}}
 return refs;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),flag=args.indexOf('--officers'),all=args.includes('--all');
 const ids=all?OFFICER_CATALOG.map(o=>o.id):flag>=0?(args[flag+1]||'').split(','):(JSON.parse(await readFile(resolve(OFFICER_ASSET_ROOT,'art-direction.json'),'utf8')).priority);
 if(ids.some(id=>!OFFICER_BY_ID[id]))throw Error('参考头像须使用名册中的稳定人物ID');
 const refs=await legacyFaceReferences(ids),record=resolve(root,'.local/officer-face-references.json');await mkdir(dirname(record),{recursive:true});await writeFile(record,JSON.stringify({version:1,localOnly:true,references:refs},null,2)+'\n');
 console.log(JSON.stringify({officers:ids.length,available:Object.keys(refs).length,missing:ids.filter(id=>!refs[id]),record:'.local/officer-face-references.json',...(!all?{references:Object.values(refs)}:{})},null,2));
}
