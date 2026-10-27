import {BATTLE_MAPS} from './data/design/battle-maps.mjs';
import {BUILTIN_MAP_CATEGORIES} from './data/design/battle-map-categories.mjs';
import {MAP_CATEGORIES,validateMapCategory,validateMapDocument,newMapId} from './battle-map-document.mjs';
export const MAP_LIBRARY_KEY='library';
export const emptyMapLibrary=()=>({format:'sango-battle-map-pack',version:1,categories:[],maps:[],draft:null});
const historic=new Set(['xiapi','guandu','chibi','hefei','yiling','wuzhang']);
export function mapCatalog(library=emptyMapLibrary(),current=null){
 const rows=Object.entries(BATTLE_MAPS).map(([id,map])=>({id,...map,category:MAP_CATEGORIES[BUILTIN_MAP_CATEGORIES[id]],source:historic.has(id)?'历史':'内置'}));
 for(const map of library.maps)rows.push({...map,source:'自建'});
 if(current){const index=rows.findIndex(m=>m.id===current.id);if(index<0)rows.push({...current,source:'当前战役'});else {const {source,...definition}=rows[index];if(JSON.stringify(definition)!==JSON.stringify(current))rows[index]={...current,source:'当前战役'};}}
 return rows;
}
export function mapCategories(library=emptyMapLibrary()){return [...Object.values(MAP_CATEGORIES),...library.categories];}
export function applyMapToDraft(draft,record){
 const {source,...definition}=record,next={...draft,mapId:record.id,terrain:record.terrain};
 if(record.format==='sango-battle-map')next.mapData=validateMapDocument(definition);else delete next.mapData;
 next.battleKind=record.category.scene==='siege'?(draft.battleKind==='defense'?'defense':'siege'):'field';
 if(next.battleKind==='field')delete next.holdUntil;
 return next;
}
export function validateMapPack(input,{draft=false}={}){
 if(!input||input.format!=='sango-battle-map-pack'||input.version!==1||!Array.isArray(input.maps)||input.maps.length>128||!Array.isArray(input.categories)||input.categories.length>32)throw Error('地图包版本或数量无效，最多128张地图及32个自建分类');
 const categories=input.categories.map(validateMapCategory),maps=input.maps.map(m=>validateMapDocument(m));
 if(categories.some(c=>MAP_CATEGORIES[c.id])||new Set(categories.map(c=>c.id)).size!==categories.length||new Set(maps.map(m=>m.id)).size!==maps.length)throw Error('地图包存在重复编号或覆盖内置分类');
 const available=[...Object.values(MAP_CATEGORIES),...categories];
 for(const map of maps)if(!available.some(c=>JSON.stringify(c)===JSON.stringify(map.category)))throw Error('地图缺少对应分类：'+map.name);
 return {format:'sango-battle-map-pack',version:1,categories,maps,draft:draft&&input.draft?validateMapDocument(input.draft,{layout:false}):null};
}
export function importMapPack(library,input){
 const single=input?.format==='sango-battle-map',source=single?{format:'sango-battle-map-pack',version:1,categories:MAP_CATEGORIES[input.category?.id]?[]:[input.category],maps:[input]}:input;
 const pack=validateMapPack(source),next=structuredClone(library),categoryIds=new Map();
 for(const c of pack.categories){let id=c.id;const exists=next.categories.find(x=>x.id===id);
  if(exists&&JSON.stringify(exists)!==JSON.stringify(c))id='map-category:'+crypto.randomUUID();
  if(!next.categories.some(x=>x.id===id))next.categories.push({...c,id});categoryIds.set(c.id,id);
 }
 let copies=0;
 for(const m of pack.maps){const map=structuredClone(m);if(next.maps.some(x=>x.id===map.id)){map.id=newMapId();map.name=map.name.slice(0,45)+' 副本';copies++;}
  if(categoryIds.has(map.category.id))map.category.id=categoryIds.get(map.category.id);next.maps.push(map);
 }
 return {library:validateMapPack(next,{draft:true}),count:pack.maps.length,copies};
}
// A separate IndexedDB keeps authored work out of game slots and small preferences.
export async function openMapLibrary({indexedDB:factory=globalThis.indexedDB,database='sango-battle-maps'}={}){
 if(!factory)throw Error('本机地图存储不可用，请导出地图保留作品');
 const db=await new Promise((ok,no)=>{const r=factory.open(database,1);r.onupgradeneeded=()=>r.result.createObjectStore('maps');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);r.onblocked=()=>no(Error('请关闭其它地图编辑窗口后重试'));});
 const transact=(mode,operation)=>new Promise((ok,no)=>{const tx=db.transaction('maps',mode,mode==='readwrite'?{durability:'strict'}:undefined),request=operation(tx.objectStore('maps'));tx.oncomplete=()=>ok(request.result);tx.onabort=()=>no(tx.error||Error('地图写入失败，原作品已保留'));tx.onerror=()=>{};});
 db.onversionchange=()=>db.close();
 return {async read(){const value=await transact('readonly',s=>s.get(MAP_LIBRARY_KEY));return value?validateMapPack(value,{draft:true}):emptyMapLibrary();},async write(value){const valid=validateMapPack(value,{draft:true});await transact('readwrite',s=>s.put(valid,MAP_LIBRARY_KEY));},close(){db.close();}};
}
