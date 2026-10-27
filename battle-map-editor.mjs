import {MAP_CATEGORIES,MAP_GROUNDS,mapSceneTerrain,createMapDocument,validateMapDocument,validateMapCategory,mapLayoutErrors,mapDocumentKey} from './battle-map-document.mjs';
import {emptyMapLibrary,mapCatalog,mapCategories,openMapLibrary,importMapPack,validateMapPack} from './battle-map-library.mjs';
import {battleMapPreview} from './battle-map-view.mjs';
import {hexNeighbors,insideHexGrid} from './hex-grid.mjs';
import {exportSaveFile} from './runtime-platform.mjs';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const colors={land:'#9aa36d',forest:'#397458',hill:'#a79066',marsh:'#708f83',water:'#5c98ae',bridge:'#c39a59',rock:'#686c6c'};
const glyphs={land:'',forest:'林',hill:'丘',marsh:'泽',water:'水',bridge:'桥',rock:'岩'};
const center=(x,y)=>[x*60+(y%2)*30+35,y*52+35];
const polygon=(x,y)=>{const[cx,cy]=center(x,y);return [[0,-32],[29,-16],[29,16],[0,32],[-29,16],[-29,-16]].map(([a,b])=>`${cx+a},${cy+b}`).join(' ');};
export function editMapCell(map,x,y,ground,{fill=false}={}){
 if(!insideHexGrid(x,y)||!Object.hasOwn(MAP_GROUNDS,ground))return false;
 const old=map.tiles[y][x];if(old===ground)return false;
 const queue=[[x,y]],seen=new Set([x+','+y]);
 for(let i=0;i<queue.length;i++){const[a,b]=queue[i];map.tiles[b][a]=ground;if(fill)for(const[c,d]of hexNeighbors({x:a,y:b}))if(insideHexGrid(c,d)&&map.tiles[d][c]===old&&!seen.has(c+','+d)){seen.add(c+','+d);queue.push([c,d]);}}
 return true;
}
export class BattleMapEditor{
 constructor({library=emptyMapLibrary(),storage=null,onRender=()=>{},onApply=()=>{},onBack=()=>{},onMessage=()=>{},warning=''}={}){
  Object.assign(this,{library,storage,onRender,onApply,onBack,onMessage,warning});this.draft=structuredClone(library.draft||createMapDocument());this.tool='paint';this.brush='forest';this.filter='all';this.preview=false;this.history=[];this.future=[];this.road=[];this.writeQueue=Promise.resolve();this.opened=false;
 }
 open(input){if(!this.opened&&!this.library.draft&&input?.mapId){const record=mapCatalog(this.library,input.mapData).find(m=>m.id===input.mapId);if(record)this.load(record.id,input.mapData);}this.opened=true;}
 async mutate(operation){
  const task=this.writeQueue.catch(()=>{}).then(async()=>{if(!this.storage)throw Error(this.warning||'本机地图存储不可用，请导出地图保留作品');const next=validateMapPack(operation(this.library),{draft:true});await this.storage.write(next);this.library=next;});this.writeQueue=task;return task;
 }
 async persistDraft(){clearTimeout(this.draftTimer);const draft=validateMapDocument(this.draft,{layout:false});await this.mutate(l=>({...l,draft}));}
 changed(before){if(mapDocumentKey(before)===mapDocumentKey(this.draft))return;this.history.push(before);if(this.history.length>60)this.history.shift();this.future=[];this.queueDraft();}
 queueDraft(){clearTimeout(this.draftTimer);this.draftTimer=setTimeout(()=>{try{validateMapDocument(this.draft,{layout:false});}catch{return;}void this.persistDraft().catch(e=>{this.warning=e.message;this.onRender();});},350);}
 load(id,current=null){const m=mapCatalog(this.library,current).find(m=>m.id===id);if(!m)return;const {source,...document}=m;this.draft=m.format==='sango-battle-map'?validateMapDocument(document):createMapDocument(m,m.category);this.history=[];this.future=[];this.road=[];this.preview=false;this.queueDraft();}
 paint(x,y){const before=structuredClone(this.draft);if(this.tool==='sample'){this.brush=this.draft.tiles[y][x];this.tool='paint';return;}
  if(this.tool==='road'){if(!this.road.some(p=>p[0]===x&&p[1]===y))this.road.push([x,y]);return;}
  editMapCell(this.draft,x,y,this.brush,{fill:this.tool==='fill'});this.changed(before);
 }
 finishRoad(){if(this.road.length<2){this.road=[];return;}const before=structuredClone(this.draft);this.draft.roads.push(this.road);this.road=[];this.changed(before);}
 async saveMap(){this.finishRoad();const map=validateMapDocument(this.draft);await this.mutate(l=>({...l,categories:mapCategories(l).some(c=>c.id===map.category.id)?l.categories:[...l.categories,map.category],draft:map,maps:[...l.maps.filter(m=>m.id!==map.id),map]}));this.warning='';this.onMessage('地图已保存');}
 async action(action,el,root){
  try{
   if(action==='back'){try{await this.persistDraft();}catch(e){this.onMessage(e.message);}this.onBack();return;}
   if(action==='apply'){await this.saveMap();this.onApply(validateMapDocument(this.draft));return;}
   if(action==='save')await this.saveMap();
   if(action==='new'){this.draft=createMapDocument(null,this.filter==='all'?MAP_CATEGORIES.field:mapCategories(this.library).find(c=>c.id===this.filter));this.history=[];this.future=[];this.road=[];this.preview=false;this.queueDraft();}
   if(action==='load')this.load(el.dataset.id);
   if(action==='copy'){this.draft=createMapDocument(this.draft,this.draft.category);this.history=[];this.future=[];this.queueDraft();}
   if(action==='brush'){this.brush=el.dataset.ground;this.tool='paint';}
   if(action==='tool')this.tool=el.dataset.tool;
   if(action==='cell'){this.paint(Number(el.dataset.x),Number(el.dataset.y));}
   if(action==='road-finish')this.finishRoad();
   if(action==='road-clear'){const before=structuredClone(this.draft);this.draft.roads=[];this.road=[];this.changed(before);}
   if(action==='undo'&&this.history.length){this.future.push(structuredClone(this.draft));this.draft=this.history.pop();this.road=[];this.queueDraft();}
   if(action==='redo'&&this.future.length){this.history.push(structuredClone(this.draft));this.draft=this.future.pop();this.queueDraft();}
   if(action==='mirror'){const before=structuredClone(this.draft);this.draft.tiles=this.draft.tiles.map(row=>[...row].reverse());this.draft.roads=this.draft.roads.map(p=>p.map(([x,y])=>[13-x,y]));this.changed(before);}
   if(action==='preview')this.preview=!this.preview;
   if(action==='category-add'){
    const name=root.querySelector('[data-map-category-name]').value,scene=root.querySelector('[data-map-category-scene]').value,c=validateMapCategory({id:'map-category:'+crypto.randomUUID(),name,scene});
    await this.mutate(l=>({...l,categories:[...l.categories,c]}));const before=structuredClone(this.draft);this.draft.category=c;this.draft.terrain=mapSceneTerrain(scene);this.changed(before);this.filter=c.id;
   }
   if(action==='delete'){
    const id=el.dataset.id;await this.mutate(l=>({...l,maps:l.maps.filter(m=>m.id!==id)}));this.onMessage('已删除，当前草稿仍可重新保存');
   }
   if(action==='import'){root.querySelector('[data-map-import]').click();return;}
   if(action==='export'||action==='export-pack'){
    this.finishRoad();const map=validateMapDocument(this.draft),pack=action==='export'?map:{format:'sango-battle-map-pack',version:1,categories:this.library.categories,maps:this.library.maps};
    if(action==='export-pack')validateMapPack(pack);await exportSaveFile(action==='export'?'战场-'+map.name+'.json':'战场地图包.json',JSON.stringify(pack,null,2));
   }
   this.onRender();
  }catch(e){this.warning=e.message;this.onMessage(e.message);this.onRender();}
 }
 async importFile(file){
  if(!file)return;try{if(file.size>2*1024*1024)throw Error('地图包不能超过2 MiB');const input=JSON.parse(await file.text());let result;await this.mutate(l=>{result=importMapPack(l,input);return result.library;});this.warning='';this.onMessage('已导入'+result.count+'张地图'+(result.copies?'，重复项保留为副本':''));this.onRender();}catch(e){this.warning=e.message;this.onMessage(e.message);this.onRender();}
 }
 change(field,value){
  if(field==='filter'){this.filter=value;return;}
  const before=structuredClone(this.draft);
  if(field==='category'){this.draft.category=structuredClone(mapCategories(this.library).find(c=>c.id===value));this.draft.terrain=mapSceneTerrain(this.draft.category.scene);if(!['port','naval'].includes(this.draft.category.scene))this.draft.deployment='mixed';}
  else if(field==='deployment'){this.draft.deployment=value;if(value==='naval')this.draft.terrain='river';}
  else this.draft[field]=value;
  this.changed(before);
 }
 unmount(){this.cleanup?.();this.cleanup=null;}
 mount(container){
  this.unmount();const root=container?.querySelector('.battle-map-editor');if(!root)return;
  let stroke=null,ignoreClickUntil=0;
  const click=e=>{const el=e.target.closest('[data-map-editor-action]');if(!el)return;e.preventDefault();e.stopPropagation();if(el.dataset.mapEditorAction==='cell'&&performance.now()<ignoreClickUntil)return;void this.action(el.dataset.mapEditorAction,el,root);};
  const change=e=>{if(e.target.matches('[data-map-import]')){void this.importFile(e.target.files[0]);return;}const field=e.target.dataset.mapEditorField;if(['name','description'].includes(field))return;if(field){this.change(field,e.target.value);this.onRender();}};
  const input=e=>{const field=e.target.dataset.mapEditorField;if(['name','description'].includes(field)){this.change(field,e.target.value);root.querySelector('[data-map-save-status]').textContent='草稿';}};
  const paintCell=el=>{const x=Number(el.dataset.x),y=Number(el.dataset.y);if(editMapCell(this.draft,x,y,this.brush)){el.setAttribute('fill',colors[this.brush]);el.setAttribute('aria-label',`${x+1}列${y+1}行 ${MAP_GROUNDS[this.brush]}`);const text=root.querySelector(`[data-map-glyph="${x}:${y}"]`);if(text)text.textContent=glyphs[this.brush];}};
  const down=e=>{const el=e.target.closest('[data-map-cell]');if(!el||this.preview||this.tool!=='paint'||e.button>0)return;e.preventDefault();stroke=structuredClone(this.draft);paintCell(el);};
  const move=e=>{if(!stroke)return;e.preventDefault();const el=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-map-cell]');if(el&&root.contains(el))paintCell(el);};
  const up=()=>{if(!stroke)return;this.changed(stroke);stroke=null;ignoreClickUntil=performance.now()+250;this.onRender();};
  const key=e=>{const el=e.target.closest('[data-map-cell]');if(!el)return;if(['Enter',' '].includes(e.key)){e.preventDefault();e.stopPropagation();const x=Number(el.dataset.x),y=Number(el.dataset.y);this.paint(x,y);this.onRender();container.querySelector(`[data-map-cell="${x}:${y}"]`)?.focus();}else if(e.key.startsWith('Arrow')){e.preventDefault();e.stopPropagation();const x=Number(el.dataset.x)+(e.key==='ArrowLeft'?-1:e.key==='ArrowRight'?1:0),y=Number(el.dataset.y)+(e.key==='ArrowUp'?-1:e.key==='ArrowDown'?1:0);root.querySelector(`[data-map-cell="${Math.max(0,Math.min(13,x))}:${Math.max(0,Math.min(7,y))}"]`)?.focus();}};
  root.addEventListener('click',click);root.addEventListener('change',change);root.addEventListener('input',input);root.addEventListener('pointerdown',down);root.addEventListener('pointermove',move);root.addEventListener('keydown',key);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up);
  this.cleanup=()=>{root.removeEventListener('click',click);root.removeEventListener('change',change);root.removeEventListener('input',input);root.removeEventListener('pointerdown',down);root.removeEventListener('pointermove',move);root.removeEventListener('keydown',key);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',up);};
 }
 markup(){
  const d=this.draft,categories=[...new Map([...mapCategories(this.library),d.category].map(c=>[c.id,c])).values()],catalog=mapCatalog(this.library),issues=mapLayoutErrors(d),saved=this.library.maps.some(m=>m.id===d.id&&mapDocumentKey(m)===mapDocumentKey(d));
  const button=(action,label,attributes='')=>`<button class="button secondary" data-map-editor-action="${action}" ${attributes}>${label}</button>`;
  const grid=`<svg class="map-paint-grid" viewBox="0 0 910 450" aria-label="战场地形编辑区">${d.tiles.map((row,y)=>row.map((ground,x)=>{const[cx,cy]=center(x,y);return `<polygon points="${polygon(x,y)}" fill="${colors[ground]}" data-map-cell="${x}:${y}" data-map-editor-action="cell" data-x="${x}" data-y="${y}" tabindex="0" role="button" aria-label="${x+1}列${y+1}行 ${MAP_GROUNDS[ground]}"/><text x="${cx}" y="${cy+4}" data-map-glyph="${x}:${y}">${glyphs[ground]}</text>`;}).join('')).join('')}${[...d.roads,...(this.road.length?[this.road]:[])].map(p=>`<polyline class="map-editor-road" points="${p.map(([x,y])=>center(x,y).join(',')).join(' ')}"/>`).join('')}${d.category.scene==='siege'?[1,12].map(x=>`<text class="map-gate-anchor" x="${center(x,4)[0]}" y="${center(x,4)[1]+17}">城门</text>`).join(''):''}</svg>`;
  return `<main class="campaign-lobby battle-map-editor"><header class="lobby-nav"><h1>战场编辑器</h1>${button('back','返回')}<button class="button primary" data-map-editor-action="apply">用于战役</button></header><div class="map-editor-workspace"><aside class="map-editor-library"><h2>地图目录 <small>${catalog.length}</small></h2><label>分类<select data-map-editor-field="filter"><option value="all">全部</option>${categories.map(c=>`<option value="${esc(c.id)}" ${this.filter===c.id?'selected':''}>${esc(c.name)}（${catalog.filter(m=>m.category.id===c.id).length}）</option>`).join('')}</select></label><div class="map-template-list">${categories.filter(c=>this.filter==='all'||c.id===this.filter).map(c=>`<details open><summary>${esc(c.name)}</summary>${catalog.filter(m=>m.category.id===c.id).map(m=>`<div><button data-map-editor-action="load" data-id="${esc(m.id)}"><span>${esc(m.name)}</span><small>${m.source}</small></button>${m.source==='自建'?button('delete','删除',`data-id="${esc(m.id)}"`):''}</div>`).join('')||'<small>暂无地图</small>'}</details>`).join('')}</div><details class="map-category-create"><summary>新增分类</summary><label>名称<input maxlength="20" data-map-category-name></label><label>用途<select data-map-category-scene>${Object.values(MAP_CATEGORIES).map(c=>`<option value="${c.scene}">${c.name}</option>`).join('')}</select></label>${button('category-add','新增')}</details></aside><section class="map-editor-canvas"><div class="map-editor-meta"><label>名称<input maxlength="50" data-map-editor-field="name" value="${esc(d.name)}"></label><label>分类<select data-map-editor-field="category">${categories.map(c=>`<option value="${esc(c.id)}" ${d.category.id===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label><span data-map-save-status>${saved?'已保存':'草稿'}</span></div><details class="map-editor-description"><summary>说明</summary><textarea maxlength="300" data-map-editor-field="description">${esc(d.description)}</textarea></details><div class="map-editor-toolbar">${button('new','新建')}${button('save','保存')}${button('copy','另存副本')}${button('import','导入')}${button('export','导出地图')}${button('export-pack','导出地图包')}<input type="file" accept=".json,application/json" data-map-import hidden></div><div class="map-ground-palette">${Object.entries(MAP_GROUNDS).map(([id,name])=>`<button data-map-editor-action="brush" data-ground="${id}" aria-pressed="${this.brush===id}" style="--ground:${colors[id]}">${name}</button>`).join('')}</div><div class="map-editor-tools">${[['paint','绘制'],['fill','填充'],['sample','取样'],['road','道路']].map(([id,name])=>button('tool',name,`data-tool="${id}" aria-pressed="${this.tool===id}"`)).join('')}${button('road-finish','结束道路',this.road.length<2?'disabled':'')}${button('road-clear','清除道路')}${button('undo','撤销',!this.history.length?'disabled':'')}${button('redo','重做',!this.future.length?'disabled':'')}${button('mirror','左右翻转')}${button('preview',this.preview?'继续编辑':'预览')}<small>道路仅作图纹 · 14×8</small></div>${['naval','port'].includes(d.category.scene)?`<label class="map-editor-deployment">部署<select data-map-editor-field="deployment"><option value="mixed" ${d.deployment==='mixed'?'selected':''}>陆军与舰船</option><option value="naval" ${d.deployment==='naval'?'selected':''}>仅舰船</option></select></label>`:''}<div class="map-editor-board">${this.preview?battleMapPreview({mapId:d.id,mapData:d,terrain:d.terrain}):grid}</div><div class="map-editor-validation" role="status">${this.warning?`<p class="map-editor-error">${esc(this.warning)}</p>`:''}${issues.length?issues.map(e=>`<p class="map-editor-error">${esc(e)}</p>`).join(''):'<p>部署、接敌与撤离通道可用</p>'}</div></section></div></main>`;
 }
}
export async function createBattleMapEditor(options){let storage=null,library=emptyMapLibrary(),warning='';try{storage=await openMapLibrary();library=await storage.read();}catch(e){storage?.close();storage=null;warning=e.message;}return new BattleMapEditor({...options,storage,library,warning});}
