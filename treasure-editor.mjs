import {TREASURE_DESIGNS,TREASURE_IDS} from './data/design/treasures.mjs';
import {BOND_DESIGNS} from './data/design/bonds.mjs';
import {TREASURE_SLOTS,treasureSlot} from './treasure-equipment.mjs';
import {TREASURE_EFFECTS,changeTreasureEffect,validateTreasurePack,defaultTreasurePack} from './treasure-catalog.mjs';
import {treasureImageMarkup} from './treasure-art.mjs';
import {exportSaveFile} from './runtime-platform.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function openTreasureLibrary({indexedDB:factory=globalThis.indexedDB,database='sango-treasures'}={}){
 if(!factory)throw Error('本机宝物存储不可用，请导出配置保留修改');
 const db=await new Promise((ok,no)=>{const r=factory.open(database,1);r.onupgradeneeded=()=>r.result.createObjectStore('config');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);r.onblocked=()=>no(Error('请关闭其它宝物编辑窗口后重试'));});
 db.onversionchange=()=>db.close();
 const transact=(mode,operation)=>new Promise((ok,no)=>{const tx=db.transaction('config',mode,mode==='readwrite'?{durability:'strict'}:undefined),r=operation(tx.objectStore('config'));tx.oncomplete=()=>ok(r.result);tx.onabort=()=>no(tx.error||Error('宝物配置保存失败，原配置已保留'));tx.onerror=()=>{};});
 return {async read(){const v=await transact('readonly',s=>s.get('catalog'));return v?validateTreasurePack(v):defaultTreasurePack();},async write(v){await transact('readwrite',s=>s.put(validateTreasurePack(v),'catalog'));},close(){db.close();}};
}
export class TreasureEditor{
 constructor({pack=defaultTreasurePack(),storage=null,warning='',onRender=()=>{},onBack=()=>{},onMessage=()=>{},onDecorate=()=>{}}={}){
  Object.assign(this,{pack,storage,warning,onRender,onBack,onMessage,onDecorate});this.draft=structuredClone(pack);this.selected=TREASURE_IDS[0];this.category='all';this.query='';this.history=[];this.future=[];this.busy=false;
 }
 get saved(){return JSON.stringify(this.draft)===JSON.stringify(this.pack);}
 remember(){this.history.push(structuredClone(this.draft));if(this.history.length>60)this.history.shift();this.future=[];this.warning='';}
 change(field,value){
  if(field==='query'||field==='category'){this[field]=value;return;}
  this.remember();const d=this.draft.treasures[this.selected];
  if(field==='name')d.name=value;
  else if(field==='kind')this.draft.treasures[this.selected]=changeTreasureEffect(d,value,value==='bond'?'bondPower':'valor',4);
  else if(field==='effect')this.draft.treasures[this.selected]=changeTreasureEffect(d,d.kind,value,Math.min(d.steps||4,value==='regrowth'?6:8));
  else if(field==='steps')this.draft.treasures[this.selected]=changeTreasureEffect(d,'entry',d.status,value===''?NaN:Number(value));
 }
 async save(){
  const next=validateTreasurePack(this.draft);if(!this.storage)throw Error(this.warning||'本机宝物存储不可用，请导出配置保留修改');
  await this.storage.write(next);this.pack=next;this.warning='';this.onMessage('宝物配置已保存，新开局生效');
 }
 async action(action,el,root){
  if(this.busy)return;
  try{
   if(action==='back'){this.onBack();return;}
   if(action==='select')this.selected=el.dataset.id;
   if(action==='save'){this.busy=true;await this.save();}
   if(action==='reset'){this.remember();this.draft.treasures[this.selected]=structuredClone(TREASURE_DESIGNS[this.selected]);}
   if(action==='reset-all'){this.remember();this.draft=defaultTreasurePack();}
   if(action==='undo'&&this.history.length){this.future.push(structuredClone(this.draft));this.draft=this.history.pop();this.warning='';}
   if(action==='redo'&&this.future.length){this.history.push(structuredClone(this.draft));this.draft=this.future.pop();this.warning='';}
   if(action==='import'){root.querySelector('[data-treasure-editor-import]').click();return;}
   if(action==='export')await exportSaveFile('宝物配置.json',JSON.stringify(validateTreasurePack(this.draft),null,2));
  }catch(e){this.warning=e.message;this.onMessage(e.message);}
  finally{this.busy=false;}
  this.onRender();
 }
 async importFile(file){
  if(!file||this.busy)return;
  try{if(file.size>256*1024)throw Error('宝物配置不能超过256 KiB');const next=validateTreasurePack(JSON.parse(await file.text()));this.remember();this.draft=next;this.onMessage('已导入宝物配置，保存后新开局生效');}
  catch(e){this.warning=e.message;this.onMessage(e.message);}this.onRender();
 }
 unmount(){this.cleanup?.();this.cleanup=null;}
 mount(container){
  this.unmount();const root=container?.querySelector('.treasure-editor');if(!root)return;
  const click=e=>{const el=e.target.closest('[data-treasure-editor-action]');if(!el)return;e.preventDefault();e.stopPropagation();void this.action(el.dataset.treasureEditorAction,el,root);};
  const input=e=>{const f=e.target.dataset.treasureEditorField;if(!['name','query'].includes(f))return;this.change(f,e.target.value);root.querySelector('.treasure-editor-error')?.remove();if(f==='query')this.refreshList(root);else{root.querySelector('[data-treasure-editor-heading]').textContent=e.target.value;this.refreshList(root);}root.querySelector('[data-treasure-editor-status]').textContent=this.saved?'已保存':'未保存';root.querySelector('[data-treasure-editor-action="undo"]').disabled=!this.history.length;root.querySelector('[data-treasure-editor-action="redo"]').disabled=!this.future.length;};
  const change=e=>{if(e.target.matches('[data-treasure-editor-import]')){void this.importFile(e.target.files[0]);e.target.value='';return;}const f=e.target.dataset.treasureEditorField;if(f&&!['name','query'].includes(f)){this.change(f,e.target.value);this.onRender();}};
  root.addEventListener('click',click);root.addEventListener('input',input);root.addEventListener('change',change);this.cleanup=()=>{root.removeEventListener('click',click);root.removeEventListener('input',input);root.removeEventListener('change',change);};
 }
 refreshList(root){root.querySelector('[data-treasure-editor-list]').innerHTML=this.listMarkup();this.onDecorate(root);}
 listMarkup(){
  const ids=TREASURE_IDS.filter(id=>(this.category==='all'||treasureSlot(id)===this.category)&&(!this.query||this.draft.treasures[id].name.includes(this.query)||TREASURE_DESIGNS[id].name.includes(this.query)));
  return ids.length?ids.map(id=>{const d=this.draft.treasures[id];return `<button type="button" class="button secondary" data-treasure-editor-action="select" data-id="${id}" aria-pressed="${this.selected===id}">${treasureImageMarkup(id,{treasureDesigns:this.draft.treasures})}<span>${esc(d.name)}<small>${TREASURE_SLOTS[treasureSlot(id)]} · ${d.kind==='bond'?esc(BOND_DESIGNS[d.bondId]?.name):TREASURE_EFFECTS[d.status]}</small></span></button>`;}).join(''):'<p>没有符合条件的宝物</p>';
 }
 markup(){
  const d=this.draft.treasures[this.selected],button=(a,t,attrs='')=>`<button type="button" class="button ${a==='save'?'primary':'secondary'}" data-treasure-editor-action="${a}" ${attrs}>${t}</button>`;
  const effects=d.kind==='bond'?Object.fromEntries(Object.entries(BOND_DESIGNS).filter(([,v])=>v.grade==='basic').map(([id,v])=>[id,v.name])):TREASURE_EFFECTS;
  return `<main class="campaign-lobby treasure-editor"><header class="lobby-nav"><h1>宝物编辑器</h1>${button('back','返回')}</header><div class="treasure-editor-toolbar">${button('save','保存配置')}${button('undo','撤销',this.history.length?'':'disabled')}${button('redo','重做',this.future.length?'':'disabled')}${button('import','导入')}${button('export','导出')}${button('reset-all','恢复全部默认')}<span data-treasure-editor-status role="status">${this.saved?'已保存':'未保存'}</span><input type="file" accept=".json,application/json" data-treasure-editor-import hidden></div><p class="treasure-editor-notice">保存后用于新开局；已有存档保留开局配置。</p>${this.warning?`<p class="treasure-editor-error" role="alert">${esc(this.warning)}</p>`:''}<div class="treasure-editor-workspace"><aside class="treasure-editor-library"><div class="treasure-editor-filters"><label>查找<input data-treasure-editor-field="query" value="${esc(this.query)}" placeholder="宝物名称" type="search"></label><label>类别<select data-treasure-editor-field="category">${Object.entries({all:'全部（70）',...TREASURE_SLOTS}).map(([id,name])=>`<option value="${id}" ${this.category===id?'selected':''}>${name}</option>`).join('')}</select></label></div><div class="treasure-editor-list ui-tabs" data-treasure-editor-list>${this.listMarkup()}</div></aside><section class="treasure-editor-detail ui-panel"><div class="treasure-editor-preview">${treasureImageMarkup(this.selected,{treasureDesigns:this.draft.treasures})}<div><h2 data-treasure-editor-heading>${esc(d.name)}</h2><p>${TREASURE_SLOTS[treasureSlot(this.selected)]}</p></div></div><div class="treasure-editor-form"><label>名称<input maxlength="30" data-treasure-editor-field="name" value="${esc(d.name)}"></label><label>效果类型<select data-treasure-editor-field="kind"><option value="bond" ${d.kind==='bond'?'selected':''}>羁绊</option><option value="entry" ${d.kind==='entry'?'selected':''}>入场增益</option></select></label><label>${d.kind==='bond'?'羁绊':'增益'}<select data-treasure-editor-field="effect">${Object.entries(effects).map(([id,name])=>`<option value="${id}" ${(d.bondId||d.status)===id?'selected':''}>${esc(name)}</option>`).join('')}</select></label>${d.kind==='entry'?`<label>持续回合<input type="number" min="1" max="${d.status==='regrowth'?6:8}" step="1" data-treasure-editor-field="steps" value="${Number.isFinite(d.steps)?d.steps:''}"></label>`:'<p>贡献 +1 · 单项上限3 · 个人合计上限6</p>'}</div><section class="treasure-editor-effect"><h3>效果</h3><p>${esc(d.description)}</p></section>${button('reset','恢复本件默认')}</section></div></main>`;
 }
}
export async function createTreasureEditor(options={}){
 let storage=null,pack=defaultTreasurePack(),warning='';try{storage=await openTreasureLibrary();pack=await storage.read();}catch(e){storage?.close();storage=null;warning=e.message;}
 return new TreasureEditor({...options,storage,pack,warning});
}
