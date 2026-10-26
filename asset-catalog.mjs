// Presentation contract. This module contains IDs and validation, never filenames or game rules.
export const TOWN_ART_KEYS=['background','buildings','construction','arrowTower','musicStage','aidCamp'];
export const TOWN_TERRAIN_KEYS=['plain','mountain','river','frontier'];
export const TOWN_FOUNDATION_KEYS=['large','small','gate','port'];
export function publicAssetURL(value,{manifest=false}={}){
 if(typeof value!=='string'||!/^\.\/assets\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_.-]+$/.test(value))return null;
 if(value.slice(2).split('/').some(part=>part.startsWith('.')))return null;
 return (manifest?/\.json$/:/\.(?:png|jpe?g|webp|svg|glb|obj)$/).test(value)?value:null;
}
const empty=keys=>Object.fromEntries(keys.map(key=>[key,'']));
export function publicMusicURL(value){
 return typeof value==='string'&&/^\.\/assets\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-][A-Za-z0-9_.-]*\.(?:ogg|wav|mp3)$/.test(value)?value:null;
}
export function sanitizeMusicCatalog(raw){
 return Object.fromEntries(Object.entries(raw||{}).flatMap(([id,entry])=>{
  const url=publicMusicURL(entry?.url),end=entry?.loopEnd;
  return /^[a-z][a-z0-9-]*$/.test(id)&&url&&Number.isFinite(end)&&end>1&&end<600&&Number.isFinite(entry.loopStart)&&entry.loopStart>=0&&entry.loopStart<end?[[id,{url,loopStart:entry.loopStart,loopEnd:end,...(/^[a-f0-9]{64}$/.test(entry.sha256||'')?{sha256:entry.sha256}:{})}]]:[];
 }));
}
export function sanitizeVoiceCatalog(raw){
 return Object.fromEntries(Object.entries(raw||{}).flatMap(([id,e])=>{
  const url=publicMusicURL(e?.url);
  return /^[a-z][a-z0-9-]*$/.test(id)&&url&&typeof e.text==='string'&&e.text.length>0&&e.text.length<=80&&Number.isFinite(e.duration)&&e.duration>0&&e.duration<=12&&/^[a-f0-9]{64}$/.test(e.sha256||'')?[[id,{url,text:e.text,duration:e.duration,sha256:e.sha256}]]:[];
 }));
}
export const assetCatalog={version:1,id:'none',revision:'none',officers:null,music:{},musicCredits:null,voices:{},voiceCredits:null,town:{art:empty(TOWN_ART_KEYS),terrains:empty(TOWN_TERRAIN_KEYS),foundations:empty(TOWN_FOUNDATION_KEYS)}};
export function sanitizeAssetCatalog(raw){
 if(raw?.version!==1||typeof raw.id!=='string'||!/^[a-z0-9-]+$/.test(raw.id))throw Error('Unsupported asset catalog');
 const group=(name,keys)=>Object.fromEntries(keys.map(key=>[key,publicAssetURL(raw.town?.[name]?.[key])||'']));
 return {version:1,id:raw.id,revision:String(raw.revision||''),officers:publicAssetURL(raw.officers,{manifest:true}),music:sanitizeMusicCatalog(raw.music),musicCredits:publicAssetURL(raw.musicCredits,{manifest:true}),voices:sanitizeVoiceCatalog(raw.voices),voiceCredits:publicAssetURL(raw.voiceCredits,{manifest:true}),town:{art:group('art',TOWN_ART_KEYS),terrains:group('terrains',TOWN_TERRAIN_KEYS),foundations:group('foundations',TOWN_FOUNDATION_KEYS)}};
}
export function applyAssetCatalog(raw){
 const catalog=sanitizeAssetCatalog(raw);
 for(const key of ['version','id','revision','officers','music','musicCredits','voices','voiceCredits'])assetCatalog[key]=catalog[key];
 for(const key of ['art','terrains','foundations'])Object.assign(assetCatalog.town[key],catalog.town[key]);
 return assetCatalog;
}
export function catalogAssetURLs(raw){
 const catalog=sanitizeAssetCatalog(raw);
 return [...new Set([catalog.officers,catalog.musicCredits,catalog.voiceCredits,...Object.values(catalog.music).map(entry=>entry.url),...Object.values(catalog.voices).map(entry=>entry.url),...Object.values(catalog.town).flatMap(Object.values)].filter(Boolean))];
}
