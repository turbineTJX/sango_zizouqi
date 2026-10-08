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
export const assetCatalog={version:1,id:'none',revision:'none',officers:null,town:{art:empty(TOWN_ART_KEYS),terrains:empty(TOWN_TERRAIN_KEYS),foundations:empty(TOWN_FOUNDATION_KEYS)}};
export function sanitizeAssetCatalog(raw){
 if(raw?.version!==1||typeof raw.id!=='string'||!/^[a-z0-9-]+$/.test(raw.id))throw Error('Unsupported asset catalog');
 const group=(name,keys)=>Object.fromEntries(keys.map(key=>[key,publicAssetURL(raw.town?.[name]?.[key])||'']));
 return {version:1,id:raw.id,revision:String(raw.revision||''),officers:publicAssetURL(raw.officers,{manifest:true}),town:{art:group('art',TOWN_ART_KEYS),terrains:group('terrains',TOWN_TERRAIN_KEYS),foundations:group('foundations',TOWN_FOUNDATION_KEYS)}};
}
export function applyAssetCatalog(raw){
 const catalog=sanitizeAssetCatalog(raw);
 for(const key of ['version','id','revision','officers'])assetCatalog[key]=catalog[key];
 for(const key of ['art','terrains','foundations'])Object.assign(assetCatalog.town[key],catalog.town[key]);
 return assetCatalog;
}
export function catalogAssetURLs(raw){
 const catalog=sanitizeAssetCatalog(raw);
 return [...new Set([catalog.officers,...Object.values(catalog.town).flatMap(Object.values)].filter(Boolean))];
}
