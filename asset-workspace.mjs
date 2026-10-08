// Node-only mount configuration shared by the server, art tools and packaging.
import {readFileSync} from 'node:fs';
import {resolve,dirname,relative,isAbsolute,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
export const PROJECT_ROOT=dirname(fileURLToPath(import.meta.url));
export function resolveAssetRoot(root=PROJECT_ROOT,env=process.env){
 let configured=env.SANGO_ASSET_ROOT;
 if(!configured){
  try{configured=JSON.parse(readFileSync(resolve(root,'.local/assets.json'),'utf8')).root;}
  catch(error){if(error.code!=='ENOENT')throw error;}
 }
 if(configured!==undefined&&(typeof configured!=='string'||!configured.trim()))throw Error('Asset root must be a nonempty path');
 return resolve(root,configured||'assets');
}
export const ASSET_ROOT=resolveAssetRoot();
export const OFFICER_ASSET_ROOT=resolve(ASSET_ROOT,'officers');
export function assetFile(url,root=ASSET_ROOT){
 if(typeof url!=='string'||!url.startsWith('./assets/'))throw Error('Expected a public asset URL');
 const path=resolve(root,url.slice('./assets/'.length));
 if(!path.startsWith(root+sep))throw Error('Asset path leaves its root');
 return path;
}
// Stored production paths remain portable when the art checkout is moved.
export function artWorkspacePath(path){
 const tail=relative(ASSET_ROOT,path);
 if(tail.startsWith('..')||isAbsolute(tail))throw Error('Production path leaves the asset workspace');
 return 'assets/'+tail.replaceAll('\\','/');
}
export function resolveArtWorkspacePath(path){
 return path.startsWith('assets/')?assetFile('./'+path):resolve(PROJECT_ROOT,path);
}
