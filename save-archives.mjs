import {battleDay} from './player-time.mjs';
import {NATIONAL_FACTIONS,nationalScenario} from './national-scenarios.mjs';
import {SCENARIOS} from './scenarios.mjs';

export const ARCHIVE_PREFIX='sango-manual-save-v1:';
export const AUTOMATIC_SAVES=[
 {key:'sango-sovereign-v2',name:'普通模式 · 自动存档'},
 {key:'sango-historical-battle-v1',name:'战役模式 · 自动存档'},
 {key:'sango-battle-lab-v1',name:'演武试炼 · 自动存档'},
];
const validKey=key=>typeof key==='string'&&(AUTOMATIC_SAVES.some(x=>x.key===key)||/^sango-manual-save-v1:[a-zA-Z0-9-]+$/.test(key));
const cleanName=name=>String(name??'').trim().slice(0,40);
// Retain small validated summaries, never manual save payloads. The storage
// token changes atomically with its bytes, including writes from other windows.
const summaryCaches=new WeakMap();
export function archiveSummary(state){
 if(state.campaign){const c=state.campaign;return {mode:'普通模式',scenario:nationalScenario(c.scenarioId)?.name||'中原征途',faction:NATIONAL_FACTIONS[c.playerFaction]?.name||'曹操',progress:`第 ${c.day} 天 · 第 ${state.turn} 旬${state.battle?' · 战斗第 '+battleDay(state.battle.tick)+' 天':''}${state.finished?' · 已结束':''}`};}
 const scenario=SCENARIOS.find(s=>s.id===state.testScenario?.id);
 return {mode:scenario?.campaign?'战役模式':'演武试炼',scenario:scenario?.name||'独立战斗',faction:'',progress:state.report?'战役结束':state.battle?`${state.battle.deploymentLocked?'战斗':'布阵'} · 第 ${battleDay(state.battle.tick)} 天`:'待命'};
}
export function inspectArchiveRaw(raw,manual,validate){
 const value=JSON.parse(raw);let payload=value,name,savedAt;
 if(manual){
  if(value?.version!==1||typeof value.name!=='string'||!Number.isFinite(value.savedAt)||typeof value.data!=='string')throw Error('存档不兼容或已损坏，请重新开始');
  payload=JSON.parse(value.data);name=cleanName(value.name)||'未命名存档';savedAt=value.savedAt;
 }
 const state=validate(payload);return {state,summary:archiveSummary(state),...(manual?{name,savedAt}:{})};
}
export async function readArchive(storage,key,validate,{inspect}={}){
 if(!validKey(key))throw new Error('无效存档');
 const raw=await storage.getItem(key);if(!raw)throw new Error('存档已不存在');
 return (inspect?await inspect(raw,key.startsWith(ARCHIVE_PREFIX),true):inspectArchiveRaw(raw,key.startsWith(ARCHIVE_PREFIX),validate)).state;
}
export async function listArchives(storage,validate,{inspect}={}){
 const versions=storage.entryVersions&&storage.getItemWithVersion?await storage.entryVersions():null;
 const all=versions?[...versions.keys()]:storage.keys?await storage.keys():Array.from({length:storage.length},(_,i)=>storage.key(i));
 const keys=all.filter(validKey);
 let cache;
 if(versions){let validators=summaryCaches.get(storage);if(!validators)summaryCaches.set(storage,validators=new WeakMap());cache=validators.get(validate);if(!cache)validators.set(validate,cache=new Map());for(const key of cache.keys())if(!versions.has(key))cache.delete(key);}
 const rows=await Promise.all(keys.map(async key=>{
  const token=versions?.get(key),cached=token&&cache.get(key);
  if(cached&&cached.token===token)return {...await cached.row};
  const automatic=AUTOMATIC_SAVES.find(x=>x.key===key),entry={key,automatic:!!automatic,name:automatic?.name||'无法识别的手动存档',savedAt:null};
  const row=(async()=>{try{
   const read=versions?await storage.getItemWithVersion(key):{raw:await storage.getItem(key)};
   if(inspect){const checked=await inspect(read.raw,!automatic,false);return {...entry,...(!automatic?{name:checked.name,savedAt:checked.savedAt}:{}),...checked.summary,error:null};}
   const value=JSON.parse(read.raw);
   if(!automatic){entry.name=cleanName(value?.name)||'未命名存档';entry.savedAt=Number.isFinite(value?.savedAt)?value.savedAt:null;if(value?.version!==1||typeof value.name!=='string'||!Number.isFinite(value.savedAt)||typeof value.data!=='string')throw new Error('invalid archive');}
   return {...entry,...archiveSummary(validate(automatic?value:JSON.parse(value.data))),error:null};
  }catch{cache?.delete(key);return {...entry,error:'版本不兼容或数据损坏，请重新开始'};}})();
  if(token)cache.set(key,{token,row});
  return {...await row};
 }));
 return rows.sort((a,b)=>Number(b.automatic)-Number(a.automatic)||(b.savedAt||0)-(a.savedAt||0)||a.key.localeCompare(b.key));
}
export async function writeArchive(storage,{name,data,key=null},validate,{inspect}={}){
 const title=cleanName(name);if(!title)throw new Error('请输入存档名称');
 if(inspect)await inspect(data,false,false);else validate(JSON.parse(data));
 if(key&&(!validKey(key)||!key.startsWith(ARCHIVE_PREFIX)||await storage.getItem(key)===null))throw new Error('请选择已有手动存档');
 const target=key||ARCHIVE_PREFIX+crypto.randomUUID();
 // One atomic write: quota failures leave the previous save intact.
 await storage.setItem(target,JSON.stringify({version:1,name:title,savedAt:Date.now(),data}));
 return target;
}
export async function deleteArchive(storage,key){
 if(!validKey(key)||!key.startsWith(ARCHIVE_PREFIX))throw new Error('只能删除手动存档');
 await storage.removeItem(key);
}
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function archivesMarkup(entries,{canSave=false,name=''}={}){
 const cards=rows=>rows.map(row=>`<article class="archive-card" data-archive-key="${esc(row.key)}"><div><h3>${esc(row.name)}</h3><p>${row.error?esc(row.error):`${esc(row.mode)} · ${esc(row.scenario)}${row.faction?' · '+esc(row.faction)+'势力':''}<br>${esc(row.progress)}`}</p><small>${row.automatic?'自动存档':row.savedAt?esc(new Date(row.savedAt).toLocaleString('zh-CN')):'保存时间不可用'}</small></div><div class="archive-buttons"><button class="button primary" data-action="archive-load" data-key="${esc(row.key)}" ${row.error?'disabled':''}>读取</button>${!row.automatic?`${canSave?`<button class="button secondary" data-action="archive-overwrite" data-key="${esc(row.key)}">覆盖保存</button>`:''}<button class="text-button" data-action="archive-delete" data-key="${esc(row.key)}">删除</button>`:''}</div></article>`).join('');
 return `${canSave?`<div class="archive-create"><label for="archive-name">新存档名称</label><input id="archive-name" maxlength="40" value="${esc(name)}" placeholder="例如：袁绍 · 官渡开战前"><button class="button primary" data-action="archive-create">新建存档</button></div>`:''}<h3>手动存档</h3><div class="archive-list">${cards(entries.filter(e=>!e.automatic))||'<p class="archive-empty">暂无手动存档。</p>'}</div><h3>自动存档</h3><div class="archive-list">${cards(entries.filter(e=>e.automatic))||'<p class="archive-empty">暂无自动存档。</p>'}</div>`;
}
